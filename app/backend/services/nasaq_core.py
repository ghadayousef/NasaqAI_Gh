"""Core business logic for the Nasaq platform: profiles, workspace, quota, AI generation."""
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.nasaq_integrations import Nasaq_integrations
from models.nasaq_payments import Nasaq_payments
from models.nasaq_profiles import Nasaq_profiles
from models.nasaq_usage import Nasaq_usage
from models.nasaq_workspaces import Nasaq_workspaces
from schemas.aihub import ChatMessage, GenTxtRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)

TRIAL_DAYS = 14
AI_MODEL = "gpt-5.4"
# None means unlimited.
PLAN_GENS: Dict[str, Optional[int]] = {"free": 10, "pro": None, "business": None}
PLAN_NAMES = {"free": "البداية", "pro": "الاحترافي", "business": "الأعمال"}
# Monthly price in ILS per billing cycle ("m" monthly, "y" monthly-equivalent billed yearly).
PRICES = {"pro": {"m": 149, "y": 119}, "business": {"m": 299, "y": 239}}
INDUSTRIES = {"مقاهي ومطاعم", "تجميل وعناية", "عيادات وصحة", "متاجر إلكترونية", "خدمات مهنية", "أزياء وملابس", "نشاط تجاري"}
PROFILE_FIELDS = ("name", "phone", "company", "industry", "city")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def month_key() -> str:
    return now_utc().strftime("%Y-%m")


def _clip(value: Any, limit: int = 120) -> str:
    return str(value or "").strip()[:limit]


def _parse_dt(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def effective_plan(profile: Nasaq_profiles) -> str:
    """Plan whose limits currently apply (expired trials fall back to free)."""
    trial_end = _parse_dt(profile.trial_ends)
    if trial_end and trial_end <= now_utc():
        return "free"
    return profile.plan if profile.plan in PLAN_GENS else "free"


def public_user(profile: Nasaq_profiles) -> Dict[str, Any]:
    trial_end = _parse_dt(profile.trial_ends)
    try:
        brand = json.loads(profile.brand_json or "{}")
    except json.JSONDecodeError:
        brand = {}
    return {
        "id": profile.user_id,
        "name": profile.name or "",
        "email": profile.email or "",
        "phone": profile.phone or "",
        "company": profile.company or "",
        "industry": profile.industry or "",
        "city": profile.city or "",
        "plan": profile.plan or "free",
        "trialEnds": int(trial_end.timestamp() * 1000) if trial_end else None,
        "onboarded": bool(profile.onboarded),
        "emailVerified": True,
        "demo": False,
        "brand": brand,
    }


async def get_profile(db: AsyncSession, user_id: str) -> Optional[Nasaq_profiles]:
    res = await db.execute(select(Nasaq_profiles).where(Nasaq_profiles.user_id == user_id).order_by(Nasaq_profiles.id))
    return res.scalars().first()


async def get_or_create_profile(db: AsyncSession, user: Any, draft: Optional[Dict[str, Any]] = None) -> Nasaq_profiles:
    """Idempotently returns the user's single profile, seeding it from the signup draft."""
    profile = await get_profile(db, user.id)
    if profile:
        return profile
    draft = draft or {}
    plan = "pro" if draft.get("plan") == "pro" else "free"
    industry = draft.get("industry") if draft.get("industry") in INDUSTRIES else "نشاط تجاري"
    profile = Nasaq_profiles(
        user_id=user.id,
        name=_clip(draft.get("name")) or (user.name or "") or user.email.split("@")[0],
        email=user.email,
        phone="",
        company=_clip(draft.get("company")),
        industry=industry,
        city=_clip(draft.get("city")),
        plan=plan,
        trial_ends=(now_utc() + timedelta(days=TRIAL_DAYS)).isoformat() if plan == "pro" else None,
        onboarded=False,
        brand_json="{}",
    )
    db.add(profile)
    await db.flush()
    return profile


def apply_profile_patch(profile: Nasaq_profiles, patch: Dict[str, Any]) -> None:
    for key in PROFILE_FIELDS:
        if key in patch and patch[key] is not None:
            setattr(profile, key, _clip(patch[key]))
    if "onboarded" in patch:
        profile.onboarded = bool(patch["onboarded"])
    if isinstance(patch.get("brand"), dict):
        profile.brand_json = json.dumps(patch["brand"], ensure_ascii=False)
    # Upgrades only happen through verified payments; users may only downgrade to free here.
    if patch.get("plan") == "free":
        profile.plan = "free"
        profile.trial_ends = None


async def get_or_create_usage(db: AsyncSession, user_id: str) -> Nasaq_usage:
    key = month_key()
    res = await db.execute(
        select(Nasaq_usage).where(Nasaq_usage.user_id == user_id, Nasaq_usage.month == key).order_by(Nasaq_usage.id)
    )
    usage = res.scalars().first()
    if usage:
        return usage
    usage = Nasaq_usage(user_id=user_id, month=key, gens=0)
    db.add(usage)
    await db.flush()
    return usage


def usage_payload(usage: Nasaq_usage, plan: str) -> Dict[str, Any]:
    return {"month": usage.month, "gens": usage.gens or 0, "limit": PLAN_GENS.get(plan)}


async def get_workspace(db: AsyncSession, user_id: str) -> Optional[Nasaq_workspaces]:
    res = await db.execute(select(Nasaq_workspaces).where(Nasaq_workspaces.user_id == user_id).order_by(Nasaq_workspaces.id))
    return res.scalars().first()


async def integrations_map(db: AsyncSession, user_id: str) -> Dict[str, bool]:
    res = await db.execute(select(Nasaq_integrations).where(Nasaq_integrations.user_id == user_id))
    status = {"meta": False, "wa": False, "tt": False, "in": False}
    for row in res.scalars().all():
        status[row.provider] = row.status == "connected"
    return status


async def delete_account_data(db: AsyncSession, user_id: str) -> None:
    for model in (Nasaq_workspaces, Nasaq_usage, Nasaq_integrations, Nasaq_payments, Nasaq_profiles):
        await db.execute(delete(model).where(model.user_id == user_id))


def _extract_json(text: str) -> str:
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    return text[start:end + 1] if start >= 0 and end > start else text


def _validate_items(payload: Any, count: int) -> List[Dict[str, Any]]:
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, list) or not items:
        raise ValueError("missing items")
    clean = []
    for it in items[:count]:
        if not isinstance(it, dict) or not it.get("cap") or not it.get("title"):
            raise ValueError("invalid item")
        tags = [str(t).strip() for t in (it.get("tags") or []) if str(t).strip()]
        clean.append({
            "title": _clip(it.get("title"), 60),
            "sub": _clip(it.get("sub"), 80),
            "cta": _clip(it.get("cta"), 30) or "تواصل معنا",
            "tag": _clip(it.get("tag"), 20),
            "cap": str(it.get("cap")).strip()[:1500],
            "tags": [t if t.startswith("#") else "#" + t.replace(" ", "_") for t in tags][:8],
        })
    return clean


async def generate_posts(brief: Dict[str, Any], count: int) -> List[Dict[str, Any]]:
    """Calls the AI model and returns validated post items (one repair retry)."""
    dialect = "اللهجة الفلسطينية العامية" if brief.get("lang") == "اللهجة الفلسطينية" else "العربية الفصحى المبسطة"
    system = (
        "أنت كاتب محتوى تسويقي محترف للسوشيال ميديا في فلسطين. "
        "أعد JSON صالحًا فقط بلا أي شرح، بالشكل: "
        '{"items":[{"title":"عنوان التصميم (حتى 5 كلمات)","sub":"سطر فرعي قصير","cta":"زر دعوة لإجراء (حتى 3 كلمات)",'
        '"tag":"شارة قصيرة أو فارغة","cap":"نص المنشور الكامل مع إيموجي وأسطر جديدة","tags":["#هاشتاغ"]}]}'
    )
    user_prompt = (
        f"اكتب {count} منشورات مختلفة الزاوية ({dialect}).\n"
        f"النشاط: {brief.get('company')} — المجال: {brief.get('industry')} — المدينة: {brief.get('city')}\n"
        f"الموضوع/المنتج: {brief.get('product')}\nالجمهور: {brief.get('audience')}\n"
        f"نبرة الهوية: {brief.get('brandTone')} — أسلوب المنشور: {brief.get('tone')}\n"
        f"المنصة: {brief.get('platform')} — النوع: {brief.get('type')}\n"
        f"صفات الهوية: {brief.get('persona')}\nمنتجات/خدمات: {brief.get('products')}\n"
        "كل منشور 3-6 أسطر، 4-6 هاشتاغات ذات صلة بينها المدينة. لا تخترع أسعارًا أو أرقامًا غير مذكورة."
    )
    service = AIHubService()
    raw = (await service.gentxt(GenTxtRequest(
        messages=[ChatMessage(role="system", content=system), ChatMessage(role="user", content=user_prompt)],
        model=AI_MODEL,
    ))).content or ""
    try:
        return _validate_items(json.loads(_extract_json(raw)), count)
    except (ValueError, json.JSONDecodeError):
        repaired = (await service.gentxt(GenTxtRequest(
            messages=[ChatMessage(role="system", content=system + " أصلح المدخل إلى JSON صالح بنفس البنية."),
                      ChatMessage(role="user", content=raw[:6000])],
            model=AI_MODEL,
        ))).content or ""
        try:
            return _validate_items(json.loads(_extract_json(repaired)), count)
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=502, detail="تعذّر تجهيز المحتوى من الـ AI، جرّب مرة ثانية.") from exc


def plan_price(plan: str, cycle: str) -> Tuple[int, int]:
    """Returns (amount in agorot, months) for a plan/cycle."""
    if plan not in PRICES:
        raise HTTPException(status_code=400, detail="باقة غير معروفة")
    months = 12 if cycle == "y" else 1
    return PRICES[plan]["y" if cycle == "y" else "m"] * months * 100, months
