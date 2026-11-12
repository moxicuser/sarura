# SARURA frontend

React + TypeScript + Vite + Tailwind CSS, following Step 6 of the development
guide. Kinyarwanda is the default language; English is a toggle in the header.

## Local setup

```powershell
cd frontend
npm install
npm run dev
```

The dev server prints the local URL (normally <http://localhost:5173>). The
backend runs separately on <http://127.0.0.1:8000>; API calls will be wired up
in the auth and dashboard steps.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) then build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite once (jsdom) |
| `npm run test:watch` | Re-run tests while files change |

## Layout

```
frontend/
  src/
    components/layout/   # Header, mobile menu, language toggle, footer, public shell
    components/ui/       # Button, Card, form fields, status pill, verification badge
    i18n/                # react-i18next setup and rw/en translation files
    lib/                 # small helpers (cx)
    pages/               # Foundation preview + temporary placeholders
    test/                # Vitest setup
```

## Colour palette

The palette lives in `tailwind.config.js` so every screen uses the same values
(from the Step 1 wireframes):

| Token | Value | Use |
|---|---|---|
| `sarura-green` | `#247A45` | Primary actions, links, brand |
| `sarura-green-dark` | `#185C35` | Hover states, footer background |
| `sarura-green-light` | `#E8F5E9` | Hero bands, selected navigation, badges |
| `sarura-page` | `#F4F6F4` | Page background |
| `sarura-border` | `#DCE3DD` | Card and input borders |
| `sarura-gray` | `#5F6B63` | Secondary text |
| `sarura-ink` | `#24332B` | Main text |
| `sarura-amber` | `#B45309` | Pending status |
| `sarura-red` | `#DC2626` | Errors and destructive actions |

Inter is bundled through `@fontsource/inter` (Latin subset only), so the site
does not depend on Google Fonts at runtime. Layouts are mobile-first: the header
collapses to a menu button, and every action stays reachable on a phone.

## Language

- `src/i18n/locales/rw.json` and `en.json` hold the UI wording; the draft comes
  from `docs/step1-translations.md` and still needs native review.
- Kinyarwanda is the default. The choice is stored in `localStorage` under
  `sarura.language`, and `<html lang>` is updated when it changes.
- Components read strings with `useTranslation()`; never hard-code UI text in a
  component.

Django's `LANGUAGE_CODE` stays `en-us` because Django ships no Kinyarwanda
translations; the React app owns the interface language.

## Temporary preview route

`/` currently renders `FoundationPage`, a preview of the shared components
(hero, search, how-it-works, buttons, cards, statuses, verification badges and a
form). All other public paths render `PlaceholderPage`. Both are replaced by the
real public pages in Step 7; do not build product features on top of them.

## Design rules

From `docs/step1-marketplace-rules.md`:

- **No decorative icons or emoji.** Navigation and actions use text labels. The
  only allowed symbols are the check mark inside a named verification badge and
  the `☰` menu button. SARURA should read as a serious agricultural technology
  platform.
- Statuses are always written as words, never colour alone; each tone still has
  a matching colour (green = confirmed/completed, amber = pending, red =
  cancelled/errors).
- Verification badges name the level: Account verified, Identity reviewed,
  Cooperative verified. A check mark never appears without its label.
- Forms put labels above inputs and show hints and errors next to the field,
  linked with `aria-describedby` and `aria-invalid`.
