from core.database import Base
from datetime import datetime as PyDateTime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class Nasaq_wa_messages(Base):
    __tablename__ = "nasaq_wa_messages"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    contact_phone: Mapped[str] = mapped_column(String, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    direction: Mapped[str] = mapped_column(String, nullable=False)
    text: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    ai: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    wa_message_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[Optional[PyDateTime]] = mapped_column(DateTime(timezone=True), default=PyDateTime.now)
    updated_at: Mapped[Optional[PyDateTime]] = mapped_column(DateTime(timezone=True), default=PyDateTime.now, onupdate=PyDateTime.now)