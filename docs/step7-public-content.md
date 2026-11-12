# Step 7 public content and placeholders

This file records the public-page copy and contact details that still need a
founder/legal decision before launch. Everything is already implemented; the
items below are marked `[review]` in the code comments and should be replaced
with confirmed values.

## Contact details

The Contact page currently shows placeholder details:

| Item | Current value | Where |
|---|---|---|
| Public email | `hello@sarura.rw` | `frontend/src/pages/ContactPage.tsx` |
| Phone | `+250 788 123 456` | `frontend/src/pages/ContactPage.tsx` |
| WhatsApp | `https://wa.me/250788123456` | `frontend/src/pages/ContactPage.tsx` |
| Privacy email | `privacy@sarura.rw` | `frontend/src/pages/PrivacyPage.tsx` |
| Notification inbox | `CONTACT_EMAIL=hello@sarura.rw` | `backend/.env.example` |

`[review]` Confirm the real inboxes, phone number and WhatsApp link. The phone
number in the example is a made-up pattern and must not go live.

## Contact form limits

- The default limit is five messages per IP per hour. `[review]` Confirm this
  suits the pilot; change `CONTACT_RATE_LIMIT`.
- Messages are stored before the email is sent. If the mail server is down the
  message is kept, and staff can still see it in Django admin.

## About page

- The team section deliberately names no individuals or partners yet.
  `[review]` Add the founder story and team details before launch.
- The "why we started" story describes the problem in general terms without
  invented facts.

## Privacy Policy

- Retention: conversations and contact messages are stated as 12 months.
  `[review]` Confirm retention periods with the founder and legal guidance.
- The policy says SARURA follows Rwanda's personal data protection law and will
  be reviewed with legal guidance before launch. `[review]` Legal review.
- Account deletion is described as a request by email. `[review]` Confirm whether
  v1 ships self-service deletion.

## Platform Policies

- The rules mirror `docs/step1-marketplace-rules.md` (honest listings, no phone
  numbers in listings, reports, cancellations, account misuse).
- `[review]` Confirm the enforcement wording (warning, removal, suspension,
  permanent closure) with the founder.

## Marketplace copy

- "Nearest district" sorting is explained in the filter panel: same district,
  then same province, then the rest of Rwanda. This matches the backend
  approximation until listings have coordinates `[review]`.
- Visitors without a location see newest listings first.
- The home page and listing cards show "No photo" text when a farmer has not
  uploaded an image. This is intentional (text-first design), not a placeholder.

## Language

All new copy was added to both `frontend/src/i18n/locales/en.json` and `rw.json`.
The Kinyarwanda wording is a draft and still needs native review, following the
same list in `docs/step1-translations.md`.
