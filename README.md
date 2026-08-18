# Habstick

A habit-coaching prototype. Instead of asking you to rebuild your routine, it maps the
day you already have, finds the moments that reliably repeat, and attaches three small
food and movement changes to them.

Built on [vinext](https://github.com/cloudflare/vinext) (Vite + React Server Components,
deployed as a Cloudflare Worker) and hosted as a ChatGPT Site.

## Prerequisites

- Node.js `>=22.13.0` (the unit tests import TypeScript directly, which needs `>=22.18`)

## Quick Start

```bash
npm install
npm run dev
```

## The idea

Three concepts carry the whole app:

- **Anchors** — moments that already happen most days (morning tea, lunch, reaching home).
  A new habit attached to an existing anchor needs no new time slot and no willpower.
- **Tiny Shifts** — one food change, one movement change, and one environment change that
  makes the other two easier. Each has a *normal* version and a deliberately small
  *minimum* version, so a bad day still has a version you can do.
- **Barriers** — when you skip a shift, the app asks why. A miss is treated as data about
  the plan, not a failure of the person, and the weekly review uses it to suggest moving a
  habit to a steadier anchor.

## How it fits together

| Path | Role |
| --- | --- |
| [`app/page.tsx`](app/page.tsx) | The entire UI. Six views (landing, onboarding, routine map, plan, dashboard, weekly review) switched by local state. |
| [`lib/engine.ts`](lib/engine.ts) | All the logic: builds the anchor timeline, generates the shifts, and aggregates the habit log into weekly stats and a review. Pure functions, no React. |
| [`lib/types.ts`](lib/types.ts) | The domain model — onboarding answers, shifts, and the habit log. |
| [`app/globals.css`](app/globals.css) | Hand-written CSS for the whole app. |
| [`worker/index.ts`](worker/index.ts) | Cloudflare Worker entry point, from the starter. Handles image optimization, then defers to vinext. |

### State

Everything lives in `localStorage` under the key `tinyshift-v2`; there is no backend and no
account. The stored shape is `{ data, log }`, where `log` is keyed by local calendar day:

```ts
log["2026-08-12"]["move"] = { date: "2026-08-12", status: "missed", barrier: "tired" }
```

Two consequences worth knowing. Completions are per-day, so today always starts empty and a
session left open past midnight rolls over on its own. And because stored JSON can come from
an older build or be edited by hand, `readStore` in [`app/page.tsx`](app/page.tsx) validates
it and falls back to a blank profile rather than trusting it.

Shifts are *templates* generated fresh from the onboarding answers; the log is the only
state. Nothing is written back onto a shift.

### The database is not wired up

[`db/schema.ts`](db/schema.ts) is intentionally empty and `.openai/hosting.json` declares no
D1 binding. The Drizzle scaffolding from the starter is still present for whenever this
needs real accounts, and [`examples/d1/`](examples/d1/) shows the shape it would take.

### Sign-in, if it is ever needed

Habstick is anonymous today. If it grows accounts, the helpers are already sitting in
[`app/chatgpt-auth.ts`](app/chatgpt-auth.ts) — `getChatGPTUser()` for optional signed-in UI,
`requireChatGPTUser(returnTo)` to send anonymous visitors through Sign in with ChatGPT, and
`chatGPTSignInPath` / `chatGPTSignOutPath` for links. Pages that use them need
`export const dynamic = "force-dynamic"`, since they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth
cookies, and header injection — don't implement app routes at those paths. Signing in proves
identity, not workspace membership; use the hosting platform's access policy or an explicit
server-side allowlist for that.

## Commands

- `npm run dev` — start local development
- `npm run build` — verify the vinext build output
- `npm run test:unit` — fast engine tests, no build required
- `npm test` — engine tests, then a build, then check the server-rendered HTML
- `npm run lint` — ESLint, including the React Hooks and jsx-a11y rules

## Known rough edges

- **The page is entirely a client component.** The server ships only a loading shell, so the
  marketing landing page has no crawlable content. Splitting the landing view into a server
  component would fix it.
- **Navigation is local state.** There are no URLs for the individual views, so you cannot
  deep-link to the dashboard and the browser Back button leaves the app.
- **`npx tsc --noEmit` reports three errors** in `worker/index.ts` and `db/index.ts`
  (`Fetcher`, `D1Database`, `cloudflare:workers`). These are starter files with no
  ambient Workers types. Adding `@cloudflare/workers-types` conflicts with wrangler 4's
  bundled types, and the supported alternative (`wrangler types`) needs a `wrangler.jsonc`
  that this starter deliberately omits. The build is unaffected.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
