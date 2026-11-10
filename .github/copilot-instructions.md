# SARURA Copilot instructions

This repository is currently a planning-only workspace for the SARURA marketplace project. The primary design source is the repository's development guide (`SARURA_Development_Guide.docx`), and there is no application code or configured build system checked in yet.

Use the development guide as the authoritative product and technical specification until actual project files are added.

## Build, test, and lint commands

There are no repository-level build, test, or lint commands configured in this repo yet.

When the app scaffold is added, follow the expected stack from the guide:

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python Django + Django REST Framework
- Database: PostgreSQL

Do not invent or add placeholder scripts without matching project manifests (`package.json`, `pyproject.toml`, etc.). Keep validation commands aligned with the actual app structure once those files exist.

For single-test runs, prefer the app's native runner once the repo is scaffolded (for example, Django's `python manage.py test ...` or Vite/React test runner commands in the frontend package). Do not add non-project-specific test shortcuts just to satisfy this file.

## High-level architecture

The intended system is a split-stack marketplace web app:

- Browser client: React + TypeScript frontend, mobile-first design, public browsing before login.
- API layer: Django + DRF backend that owns all authorization checks and business rules.
- Data layer: PostgreSQL database with app models for users, products, requests, offers, orders, chat, notifications, and admin operations.

The app is organized around these domains, as described in the development guide:

- `backend/config/` — Django settings and routing
- `backend/accounts/` — user model, roles, profiles, verification
- `backend/marketplace/` — categories, product listings, images, search, filters
- `backend/deals/` — purchase requests, offers, negotiation, orders
- `backend/messaging/` — conversations and message storage
- `backend/notifications/` — in-app and email notifications
- `backend/core/` — contact messages and static content
- `frontend/src/pages/` — public and dashboard views
- `frontend/src/components/` — shared UI
- `frontend/src/features/` — domain-specific state and logic
- `frontend/src/lib/` — API client and helpers
- `frontend/src/i18n/` — Kinyarwanda and English translations

This split should be preserved as the project evolves. Authorization is enforced on the server, not trusted from the browser.

## Key project conventions

These conventions are explicitly required by the SARURA plan and are more important than generic coding advice:

- Mobile-first design: build for phone screens first, then tablet/desktop.
- Public browsing without login: visitors can browse and view public listings; private actions require login and role checks.
- Login-gate flow: when a visitor clicks "Negotiate" on a product, redirect them to a buyer account flow and return them to the same product afterward.
- Roles: buyer, farmer, and admin are distinct; access is restricted by role and ownership.
- Server-side enforcement only: no trusting the browser for permissions, pricing, or ownership checks.
- Database-first architecture: messages, requests, offers, and order history are stored server-side in PostgreSQL; browsers never act as the source of truth.
- No raw SQL from user input: use Django ORM only.
- No sensitive data in browser storage: never store message text, passwords, or login tokens in local storage.
- Multi-language product UX: Kinyarwanda and English from the start, with the UI and user messaging designed for a low-data, low-smartphone environment.
- Design system rules: restrained green/gray palette, minimal color usage, readable contrast, labels in words rather than color alone, and accessible interaction patterns.
- Verification and safety: public phone/email data is restricted, admin access is tightly controlled, and reports/blocks are supported for risky transactions.
- Security posture: HTTPS, secure cookies, environment-based secrets, validation on the backend, rate limiting, and regular dependency audits are required before launch.

## Working expectations for this repo

- Treat the development guide as the source of product requirements and priority order.
- Keep implementation work aligned with the planned release phases rather than inventing an alternative architecture.
- Prefer small, coherent backend/frontend modules that match the app domains above.
- When the repo gains runnable code, validate permissions and business rules before shipping features such as chat access, product editing, and order status flows.
- Keep the design accessible and relevant to farmers and buyers in Rwanda, not a generic marketplace pattern.
