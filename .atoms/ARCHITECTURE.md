---
last_updated: 2026-09-30T23:43:21Z
---

# Architecture Design

## System Overview
منصة «نسق»: واجهة HTML/CSS/JS الأصلية داخل app/frontend/public (landing, auth, dashboard, legal) + خادم Atoms Cloud (FastAPI/Python) + PostgreSQL. الدخول عبر Atoms Auth (/login → /auth/callback → / → dashboard).

- API: app/backend/routers/nasaq.py (bootstrap, profile, workspace, generate gpt-5.4 مع حد الباقة، integrations Meta/WA، Stripe checkout/verify)
- منطق: app/backend/services/nasaq_core.py
- جداول: nasaq_profiles, nasaq_workspaces, nasaq_usage, nasaq_payments, nasaq_integrations
- الواجهة: auth.js و session.js تستدعي /api/v1/nasaq بدل localStorage

## Tech Stack

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|

## File Tree Plan

## Implementation Guide

