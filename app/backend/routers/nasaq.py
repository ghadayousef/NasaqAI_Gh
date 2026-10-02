"""Nasaq platform API: account, workspace, AI quota/generation, integrations, billing."""
import json
import logging
from typing import Any, Dict, Optional

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from models.nasaq_integrations import Nasaq_integrations
from models.nasaq_payments import Nasaq_payments
from models.nasaq_workspaces import Nasaq_workspaces
from schemas.auth import UserResponse
from services import nasaq_core as core
from prompts.brand_media import build as build_media
from schemas.aihub import ChatMessage, GenImgRequest, GenTxtRequest, GenVideoRequest
from services.aihub import AIHubService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/nasaq", tags=["nasaq"])

MAX_WORKSPACE_BYTES = 4_000_000
PROVIDERS = {"meta": "Meta (فيسبوك وإنستغرام)", "wa": "واتساب للأعمال"}


class BootstrapRequest(BaseModel):
    draft: Optional[Dict[str, Any]] = None


class ProfilePatch(BaseModel):
    patch: Dict[str, Any] = Field(default_factory=dict)


class WorkspaceBody(BaseModel):
    data: Dict[str, Any]


class GenerateRequest(BaseModel):
    count: int = Field(3, ge=1, le=6)
    brief: Dict[str, Any] = Field(default_factory=dict)


class StudyRequest(BaseModel):
    logo: str


class MediaRequest(BaseModel):
    brief: Dict[str, Any] = Field(default_factory=dict)
    brand: Dict[str, Any] = Field(default_factory=dict)


IMG_SIZES = {"1:1": "1024x1024", "4:5": "1024x1536", "9:16": "1024x1536", "16:9": "1536x1024"}


class IntegrationRequest(BaseModel):
    provider: str
    account_name: str = ""
    external_id: str = ""
    access_token: str = ""


class CheckoutRequest(BaseModel):
    plan: str
    cycle: str = "m"


class VerifyRequest(BaseModel):
    session_id: str


async def _state(db: AsyncSession, user: UserResponse, draft: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    profile = await core.get_or_create_profile(db, user, draft)
    usage = await core.get_or_create_usage(db, user.id)
    ws = await core.get_workspace(db, user.id)
    integ = await core.integrations_map(db, user.id)
    plan = core.effective_plan(profile)
    workspace = None
    if ws and ws.data_json:
        try:
            workspace = json.loads(ws.data_json)
        except json.JSONDecodeError:
            workspace = None
    result = {
        "user": core.public_user(profile),
        "usage": core.usage_payload(usage, plan),
        "workspace": workspace,
        "integ": integ,
    }
    await db.commit()
    return result


@router.post("/bootstrap")
async def bootstrap(body: BootstrapRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await _state(db, user, body.draft)


@router.patch("/profile")
async def update_profile(body: ProfilePatch, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await core.get_or_create_profile(db, user)
    core.apply_profile_patch(profile, body.patch)
    data = core.public_user(profile)
    await db.commit()
    return {"user": data}


@router.put("/workspace")
async def save_workspace(body: WorkspaceBody, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    body.data.pop("integ", None)
    body.data.pop("meta", None)
    raw = json.dumps(body.data, ensure_ascii=False)
    if len(raw.encode("utf-8")) > MAX_WORKSPACE_BYTES:
        raise HTTPException(status_code=413, detail="مساحة العمل أكبر من الحد المسموح")
    ws = await core.get_workspace(db, user.id)
    if ws:
        ws.data_json = raw
    else:
        db.add(Nasaq_workspaces(user_id=user.id, data_json=raw))
    await db.commit()
    return {"ok": True}


@router.delete("/account")
async def delete_account(user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await core.delete_account_data(db, user.id)
    await db.commit()
    return {"ok": True}


@router.post("/generate")
async def generate(body: GenerateRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Phase 1: reserve quota atomically before the slow AI call.
    profile = await core.get_or_create_profile(db, user)
    plan = core.effective_plan(profile)
    limit = core.PLAN_GENS.get(plan)
    usage = await core.get_or_create_usage(db, user.id)
    used = usage.gens or 0
    count = body.count
    if limit is not None:
        left = max(0, limit - used)
        if left <= 0:
            await db.commit()
            raise HTTPException(status_code=402, detail="خلصت توليدات باقتك لهذا الشهر — رقِّ خطتك من الفوترة")
        count = min(count, left)
    usage.gens = used + count
    usage_id = usage.id
    brief = {**body.brief, "company": profile.company, "industry": profile.industry,
             "city": profile.city or body.brief.get("city", "")}
    await db.commit()

    try:
        items = await core.generate_posts(brief, count)
    except Exception:
        # Refund the reservation when generation fails.
        refund = await db.get(core.Nasaq_usage, usage_id)
        if refund:
            refund.gens = max(0, (refund.gens or 0) - count)
            await db.commit()
        raise

    if len(items) < count:
        refund = await db.get(core.Nasaq_usage, usage_id)
        if refund:
            refund.gens = max(0, (refund.gens or 0) - (count - len(items)))
            await db.commit()
    final = await db.get(core.Nasaq_usage, usage_id)
    payload = core.usage_payload(final, plan)
    await db.commit()
    return {"items": items, "usage": payload}


@router.post("/integrations")
async def connect_integration(body: IntegrationRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if body.provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="تكامل غير مدعوم حاليًا")
    if not body.external_id.strip() or not body.access_token.strip():
        raise HTTPException(status_code=400, detail="أدخل المعرّف ورمز الوصول")
    res = await db.execute(select(Nasaq_integrations).where(
        Nasaq_integrations.user_id == user.id, Nasaq_integrations.provider == body.provider))
    row = res.scalars().first()
    if not row:
        row = Nasaq_integrations(user_id=user.id, provider=body.provider)
        db.add(row)
    row.account_name = body.account_name.strip()[:120]
    row.external_id = body.external_id.strip()[:120]
    row.access_token = body.access_token.strip()
    row.status = "connected"
    await db.commit()
    return {"integ": await _integ(db, user.id)}


@router.delete("/integrations/{provider}")
async def disconnect_integration(provider: str, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Nasaq_integrations).where(
        Nasaq_integrations.user_id == user.id, Nasaq_integrations.provider == provider))
    for row in res.scalars().all():
        await db.delete(row)
    await db.commit()
    return {"integ": await _integ(db, user.id)}


@router.post("/integrations/{provider}/check")
async def check_integration(provider: str, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Verifies stored credentials live against the Meta Graph API."""
    res = await db.execute(select(Nasaq_integrations).where(
        Nasaq_integrations.user_id == user.id, Nasaq_integrations.provider == provider))
    row = res.scalars().first()
    if not row:
        await db.commit()
        raise HTTPException(status_code=404, detail="هذا التكامل غير مربوط")
    ext_id, tok = row.external_id, row.access_token
    await db.commit()
    fields = "display_phone_number,verified_name,quality_rating" if provider == "wa" else "name"
    try:
        async with httpx.AsyncClient(timeout=15) as http:
            r = await http.get(f"https://graph.facebook.com/v21.0/{ext_id}", params={"fields": fields},
                               headers={"Authorization": f"Bearer {tok}"})
        body = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="تعذّر الوصول لخوادم Meta، جرّب بعد قليل")
    if (r.status_code != 200 or "error" in body) and provider == "wa":
        # The saved ID may be a WhatsApp Business Account ID: look up its phone numbers and auto-correct.
        try:
            async with httpx.AsyncClient(timeout=15) as http:
                r2 = await http.get(f"https://graph.facebook.com/v21.0/{ext_id}/phone_numbers",
                                    params={"fields": "id,display_phone_number,verified_name"},
                                    headers={"Authorization": f"Bearer {tok}"})
            phones = (r2.json() or {}).get("data") if r2.status_code == 200 else None
        except Exception:
            phones = None
        if phones:
            first = phones[0]
            res = await db.execute(select(Nasaq_integrations).where(
                Nasaq_integrations.user_id == user.id, Nasaq_integrations.provider == "wa"))
            row = res.scalars().first()
            row.external_id = first["id"]
            await db.commit()
            return {"ok": True, "detail": f"صحّحنا المعرّف تلقائيًا إلى Phone Number ID {first['id']} — "
                                          f"{first.get('verified_name', '')} {first.get('display_phone_number', '')}"}
    if r.status_code != 200 or "error" in body:
        msg = (body.get("error") or {}).get("message", "") if isinstance(body, dict) else ""
        if "does not exist" in msg or "missing permissions" in msg:
            msg = ("المعرّف غير صحيح أو الرمز بدون صلاحية عليه. ضع Phone Number ID من WhatsApp ← API Setup "
                   "(وليس رقم الهاتف أو App ID)، وتأكد أن الرمز فيه whatsapp_business_management و whatsapp_business_messaging.")
        return {"ok": False, "detail": msg or "رفضت Meta البيانات"}
    if provider == "wa":
        return {"ok": True, "detail": f"{body.get('verified_name', '')} — {body.get('display_phone_number', '')}"}
    return {"ok": True, "detail": body.get("name", "")}


async def _integ(db: AsyncSession, user_id: str) -> Dict[str, bool]:
    data = await core.integrations_map(db, user_id)
    await db.commit()
    return data


@router.post("/payment/create_payment_session")
async def create_payment_session(body: CheckoutRequest, request: Request,
                                 user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    amount, months = core.plan_price(body.plan, body.cycle)
    host = request.headers.get("App-Host") or ""
    if host and not host.startswith(("http://", "https://")):
        host = f"https://{host}"
    if not host:
        raise HTTPException(status_code=400, detail="تعذّر تحديد عنوان الموقع")
    order = Nasaq_payments(user_id=user.id, plan=body.plan, cycle="y" if body.cycle == "y" else "m",
                           amount=amount / 100, currency="ils", status="pending")
    db.add(order)
    await db.commit()
    order_id = order.id

    stripe.api_key = settings.stripe_secret_key
    try:
        session = await stripe.checkout.Session.create_async(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "ils",
                    "unit_amount": amount,
                    "product_data": {"name": f"نسق — باقة {core.PLAN_NAMES[body.plan]} ({months} شهر)"},
                },
                "quantity": 1,
            }],
            success_url=f"{host}/dashboard/index.html?session_id={{CHECKOUT_SESSION_ID}}#/settings/billing",
            cancel_url=f"{host}/dashboard/index.html#/settings/billing",
            metadata={"order_id": str(order_id), "user_id": user.id},
            **({"customer_email": user.email} if user.email else {}),
        )
    except Exception as exc:
        logger.error("Stripe session error: %s", exc)
        raise HTTPException(status_code=502, detail="تعذّر فتح صفحة الدفع، جرّب بعد قليل")

    row = await db.get(Nasaq_payments, order_id)
    row.stripe_session_id = session.id
    await db.commit()
    return {"session_id": session.id, "url": session.url}


@router.post("/payment/verify_payment")
async def verify_payment(body: VerifyRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stripe.api_key = settings.stripe_secret_key
    try:
        session = await stripe.checkout.Session.retrieve_async(body.session_id)
    except Exception as exc:
        logger.error("Stripe verify error: %s", exc)
        raise HTTPException(status_code=502, detail="تعذّر التحقق من الدفع")
    meta = session.metadata or {}
    if meta.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="عملية الدفع لا تخص هذا الحساب")
    order = await db.get(Nasaq_payments, int(meta.get("order_id", 0)))
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    paid = session.payment_status == "paid"
    if paid and order.status != "paid":
        order.status = "paid"
        profile = await core.get_or_create_profile(db, user)
        profile.plan = order.plan
        profile.trial_ends = None
    elif not paid and session.status == "expired":
        order.status = "cancelled"
    status = order.status
    await db.commit()
    state = await _state(db, user)
    return {"status": status, "payment_status": session.payment_status, **state}


@router.post("/media")
async def generate_media(body: MediaRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Brand-faithful visual via prompts/brand_media.build; counts as one generation."""
    profile = await core.get_or_create_profile(db, user)
    plan = core.effective_plan(profile)
    limit = core.PLAN_GENS.get(plan)
    usage = await core.get_or_create_usage(db, user.id)
    if limit is not None and (usage.gens or 0) >= limit:
        await db.commit()
        raise HTTPException(status_code=402, detail="خلصت توليدات باقتك لهذا الشهر — رقِّ خطتك من الفوترة")
    usage.gens = (usage.gens or 0) + 1
    usage_id = usage.id
    try:
        saved_brand = json.loads(profile.brand_json or "{}")
    except json.JSONDecodeError:
        saved_brand = {}
    brand = {**saved_brand, **{k: v for k, v in body.brand.items() if v}}
    brand.update({"name": profile.company, "industry": profile.industry, "city": profile.city or brand.get("city", "")})
    await db.commit()

    job = build_media(brand, body.brief)
    comp = job["composite"]
    service = AIHubService()
    concept = await _creative_concept(service, job["image_prompt"], comp["kind"])
    prompt = f"{job['image_prompt']}\n\nCREATIVE CONCEPT (follow exactly, keep all rules above):\n{concept}\n\nAVOID: {job['negative']}"
    try:
        if comp["kind"] == "video":
            res = await service.genvideo(GenVideoRequest(prompt=prompt, model="seedance-2.0-fast"))
            media = {"video_url": res.url}
        else:
            res = await service.genimg(GenImgRequest(prompt=prompt, model="gpt-image-2",
                                                     size=IMG_SIZES.get(comp["ratio"], "1024x1024")))
            media = {"image_url": res.images[0]}
    except Exception as exc:
        logger.error("media generation failed: %s", exc)
        refund = await db.get(core.Nasaq_usage, usage_id)
        if refund:
            refund.gens = max(0, (refund.gens or 0) - 1)
        await db.commit()
        raise HTTPException(status_code=502, detail="تعذّر توليد التصميم، جرّب مرة ثانية")
    final = await db.get(core.Nasaq_usage, usage_id)
    payload = core.usage_payload(final, plan)
    await db.commit()
    comp.pop("logo_file", None)
    return {**media, "composite": comp, "usage": payload}


ROLES = ["أساسي", "مميّز", "خلفية", "ثانوي", "نصوص"]


async def _creative_concept(service: AIHubService, brief_prompt: str, kind: str) -> str:
    """Art-director pass: invents one bold, specific, on-brand scene so results are never generic."""
    system = ("You are an award-winning creative director for premium social ads (Cannes Lions level). "
              "Read the brief and invent ONE striking, original concept that still obeys every rule in it. "
              "Be concrete: hero subject and styling, set & props local to the city, camera lens/angle, lighting setup, "
              "composition with the quiet logo corner and empty text area, and how the exact palette hex colors appear "
              "(backdrop, props, light gels). Avoid clichés and stock-photo looks. "
              + ("For video, give a shot list with timings and camera moves. " if kind == "video" else "")
              + "Write 90-140 words in English, no preamble, no letters/text in the picture.")
    try:
        res = await service.gentxt(GenTxtRequest(messages=[ChatMessage(role="system", content=system),
                                                           ChatMessage(role="user", content=brief_prompt)],
                                                 model="claude-opus-4.6"))
        return (res.content or "").strip()[:1500]
    except Exception as exc:
        logger.warning("concept step failed: %s", exc)
        return "Bold editorial hero shot, dramatic soft key light, palette-graded set, generous negative space."


@router.post("/brand/study")
async def study_logo(body: StudyRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Reads the real logo with a vision model and extracts the brand palette and personality."""
    if not body.logo.startswith(("data:image", "http")):
        raise HTTPException(status_code=400, detail="ارفع الشعار أولًا")
    prompt = ("حلّل هذا الشعار كمصمم هوية بصرية. استخرج لوحة ألوان من 5 ألوان مأخوذة من الشعار نفسه "
              "(ولون خلفية فاتح متناسق، ولون نصوص غامق مقروء). أعد JSON فقط: "
              '{"colors":[{"role":"أساسي","name":"اسم عربي","hex":"#RRGGBB"},{"role":"مميّز",...},{"role":"خلفية",...},'
              '{"role":"ثانوي",...},{"role":"نصوص",...}],"persona":["3 صفات عربية قصيرة"]}')
    service = AIHubService()
    res = await service.gentxt(GenTxtRequest(model="gemini-3.1-pro-preview", messages=[ChatMessage(role="user", content=[
        {"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": body.logo}}])]))
    try:
        data = json.loads(core._extract_json(res.content or ""))
        colors = [c for c in data.get("colors", []) if isinstance(c, dict) and str(c.get("hex", "")).startswith("#")]
        if len(colors) < 3:
            raise ValueError
    except (ValueError, json.JSONDecodeError):
        raise HTTPException(status_code=502, detail="ما قدرنا نقرأ ألوان الشعار، جرّب صورة أوضح")
    for i, c in enumerate(colors[:5]):
        c["role"] = c.get("role") if c.get("role") in ROLES else ROLES[i]
        c["hex"] = c["hex"][:7]
    persona = [str(x)[:20] for x in (data.get("persona") or [])][:4]
    profile = await core.get_or_create_profile(db, user)
    try:
        brand = json.loads(profile.brand_json or "{}")
    except json.JSONDecodeError:
        brand = {}
    brand.update({"colors": colors[:5], **({"persona": persona} if persona else {})})
    profile.brand_json = json.dumps(brand, ensure_ascii=False)
    await db.commit()
    return {"colors": colors[:5], "persona": persona}
