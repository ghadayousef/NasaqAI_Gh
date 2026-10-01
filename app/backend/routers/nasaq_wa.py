"""WhatsApp Cloud API: webhook intake, conversations, manual/AI replies and auto-reply."""
import json
import logging
import secrets
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from models.nasaq_integrations import Nasaq_integrations
from models.nasaq_wa_messages import Nasaq_wa_messages
from schemas.aihub import ChatMessage, GenTxtRequest
from schemas.auth import UserResponse
from services import nasaq_core as core
from services.aihub import AIHubService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/wa", tags=["whatsapp"])
GRAPH = "https://graph.facebook.com/v21.0"
REPLY_MODEL = "deepseek-v4-flash"


class SendRequest(BaseModel):
    phone: str
    text: str


class PhoneRequest(BaseModel):
    phone: str


class SettingsRequest(BaseModel):
    auto_reply: bool


async def _wa_row(db: AsyncSession, user_id: str) -> Optional[Nasaq_integrations]:
    res = await db.execute(select(Nasaq_integrations).where(
        Nasaq_integrations.user_id == user_id, Nasaq_integrations.provider == "wa"))
    return res.scalars().first()


async def _send(phone_id: str, token: str, to: str, text: str) -> str:
    async with httpx.AsyncClient(timeout=20) as http:
        r = await http.post(f"{GRAPH}/{phone_id}/messages", headers={"Authorization": f"Bearer {token}"},
                            json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}})
    body = r.json() if r.content else {}
    if r.status_code != 200:
        msg = (body.get("error") or {}).get("message", "") if isinstance(body, dict) else ""
        raise HTTPException(status_code=502, detail=f"رفضت واتساب الإرسال: {msg}")
    return ((body.get("messages") or [{}])[0]).get("id", "")


async def _history(db: AsyncSession, user_id: str, phone: str, limit: int = 12) -> List[Nasaq_wa_messages]:
    res = await db.execute(select(Nasaq_wa_messages).where(
        Nasaq_wa_messages.user_id == user_id, Nasaq_wa_messages.contact_phone == phone
    ).order_by(Nasaq_wa_messages.id.desc()).limit(limit))
    return list(reversed(res.scalars().all()))


async def _ai_reply(profile: Any, history: List[Dict[str, str]]) -> str:
    try:
        brand = json.loads(profile.brand_json or "{}")
    except json.JSONDecodeError:
        brand = {}
    system = (
        f"أنت موظف خدمة عملاء على واتساب لنشاط «{profile.company}» ({profile.industry}) في {profile.city}. "
        "رد باللهجة الفلسطينية بلطف واختصار (1-4 أسطر) مع إيموجي خفيف. "
        f"الجمهور: {brand.get('audience', '')}. المنتجات/الخدمات: {brand.get('products', '')}. "
        "لا تخترع أسعارًا أو مواعيد أو عروضًا غير مذكورة؛ إذا ما بتعرف قل إن الفريق رح يأكد قريبًا. أعد نص الرد فقط."
    )
    msgs = [ChatMessage(role="system", content=system)]
    for m in history:
        msgs.append(ChatMessage(role="user" if m["dir"] == "in" else "assistant", content=m["text"]))
    res = await AIHubService().gentxt(GenTxtRequest(messages=msgs, model=REPLY_MODEL))
    text = (res.content or "").strip()
    if not text:
        raise HTTPException(status_code=502, detail="ما قدر الـ AI يصيغ رد")
    return text[:1500]


# ---------------- Webhook (public, called by Meta) ----------------

@router.get("/webhook")
async def verify_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    q = request.query_params
    token = q.get("hub.verify_token", "")
    if q.get("hub.mode") == "subscribe" and token:
        res = await db.execute(select(Nasaq_integrations).where(Nasaq_integrations.verify_token == token))
        if res.scalars().first():
            return PlainTextResponse(q.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="verify token mismatch")


@router.post("/webhook")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        payload = await request.json()
    except Exception:
        return {"ok": True}
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            phone_id = (value.get("metadata") or {}).get("phone_number_id")
            if not phone_id:
                continue
            res = await db.execute(select(Nasaq_integrations).where(
                Nasaq_integrations.provider == "wa", Nasaq_integrations.external_id == phone_id))
            integ = res.scalars().first()
            if not integ:
                continue
            names = {c.get("wa_id"): (c.get("profile") or {}).get("name", "") for c in value.get("contacts", [])}
            for st in value.get("statuses", []):
                r2 = await db.execute(select(Nasaq_wa_messages).where(Nasaq_wa_messages.wa_message_id == st.get("id")))
                row = r2.scalars().first()
                if row:
                    row.status = st.get("status", row.status)
            for msg in value.get("messages", []):
                exists = await db.execute(select(Nasaq_wa_messages.id).where(Nasaq_wa_messages.wa_message_id == msg.get("id")))
                if exists.first():
                    continue
                text = (msg.get("text") or {}).get("body") or f"[{msg.get('type', 'رسالة')}]"
                sender = msg.get("from", "")
                db.add(Nasaq_wa_messages(user_id=integ.user_id, contact_phone=sender, contact_name=names.get(sender, ""),
                                         direction="in", text=text, ai=False, wa_message_id=msg.get("id"), status="received"))
                await db.commit()
                if integ.auto_reply and msg.get("type") == "text":
                    await _auto_reply(db, integ, sender)
    await db.commit()
    return {"ok": True}


async def _auto_reply(db: AsyncSession, integ: Nasaq_integrations, phone: str) -> None:
    user_id, phone_id, token = integ.user_id, integ.external_id, integ.access_token
    profile = await core.get_profile(db, user_id)
    hist = [{"dir": m.direction, "text": m.text} for m in await _history(db, user_id, phone)]
    await db.commit()
    if not profile:
        return
    try:
        reply = await _ai_reply(profile, hist)
        wid = await _send(phone_id, token, phone, reply)
    except Exception as exc:
        logger.warning("auto-reply failed: %s", exc)
        return
    db.add(Nasaq_wa_messages(user_id=user_id, contact_phone=phone, direction="out", text=reply, ai=True,
                             wa_message_id=wid, status="sent"))
    await db.commit()


# ---------------- Authenticated dashboard API ----------------

@router.get("/settings")
async def get_settings(request: Request, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _wa_row(db, user.id)
    if not row:
        await db.commit()
        return {"connected": False}
    if not row.verify_token:
        row.verify_token = secrets.token_urlsafe(18)
    data = {"connected": True, "auto_reply": bool(row.auto_reply), "verify_token": row.verify_token}
    await db.commit()
    return data


@router.put("/settings")
async def put_settings(body: SettingsRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _wa_row(db, user.id)
    if not row:
        raise HTTPException(status_code=404, detail="اربط واتساب أولًا")
    row.auto_reply = body.auto_reply
    await db.commit()
    return {"auto_reply": body.auto_reply}


@router.get("/conversations")
async def conversations(user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Nasaq_wa_messages).where(Nasaq_wa_messages.user_id == user.id)
                           .order_by(Nasaq_wa_messages.id.desc()).limit(1500))
    convs: Dict[str, Dict[str, Any]] = {}
    for m in reversed(res.scalars().all()):
        c = convs.setdefault(m.contact_phone, {"phone": m.contact_phone, "name": "", "messages": []})
        if m.contact_name:
            c["name"] = m.contact_name
        c["messages"].append({"from": m.direction, "text": m.text, "ai": bool(m.ai), "status": m.status,
                              "at": m.created_at.isoformat() if m.created_at else None, "id": m.id})
    await db.commit()
    items = sorted(convs.values(), key=lambda c: c["messages"][-1]["id"], reverse=True)
    return {"items": items}


@router.post("/send")
async def send(body: SendRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="اكتب نص الرسالة")
    row = await _wa_row(db, user.id)
    if not row:
        raise HTTPException(status_code=404, detail="اربط واتساب أولًا")
    phone_id, token = row.external_id, row.access_token
    await db.commit()
    wid = await _send(phone_id, token, body.phone, text)
    db.add(Nasaq_wa_messages(user_id=user.id, contact_phone=body.phone, direction="out", text=text, ai=False,
                             wa_message_id=wid, status="sent"))
    await db.commit()
    return {"ok": True}


@router.post("/ai-reply")
async def ai_reply(body: PhoneRequest, user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    row = await _wa_row(db, user.id)
    if not row:
        raise HTTPException(status_code=404, detail="اربط واتساب أولًا")
    phone_id, token = row.external_id, row.access_token
    profile = await core.get_or_create_profile(db, user)
    hist = [{"dir": m.direction, "text": m.text} for m in await _history(db, user.id, body.phone)]
    await db.commit()
    if not hist:
        raise HTTPException(status_code=400, detail="ما في رسائل بهالمحادثة")
    reply = await _ai_reply(profile, hist)
    wid = await _send(phone_id, token, body.phone, reply)
    db.add(Nasaq_wa_messages(user_id=user.id, contact_phone=body.phone, direction="out", text=reply, ai=True,
                             wa_message_id=wid, status="sent"))
    await db.commit()
    return {"ok": True, "text": reply}
