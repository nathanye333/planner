# Gather — Engineering Handoff

This document orients another engineer/agent to the **Gather** codebase: what's
built, how it's structured, what's deployed, and what's left. Read this together
with the root [`README.md`](../README.md) and
[`docs/GOOGLE_CALENDAR_SETUP.md`](GOOGLE_CALENDAR_SETUP.md).

## What Gather is

Privacy-first social scheduling that blends When2Meet (availability heatmaps),
TimeTree (shared group calendars), and Partiful (events + social feed). Calendar
sync reads **only** coarse availability (`COMMITTED` / `TENTATIVE` / `FREE`) —
never event titles or descriptions.

## Status — feature-complete MVP, deployed

All 7 implementation phases are done. Build, typecheck, and lint are clean.

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Scaffold (Next.js + TS + Tailwind + shadcn), Supabase clients, middleware, Supabase project | Done |
| 2 | Google OAuth, auth callback, onboarding, profiles + RLS, protected routes | Done |
| 3 | Friends, groups (CRUD/roles), realtime notifications base | Done |
| 4 | `availability_blocks`, manual editor, FullCalendar views, Google sync scaffold + cron | Done |
| 5 | Events CRUD, cover upload, invites, RSVP counts, visibility enforcement | Done |
| 6 | Availability planners, `AvailabilityGrid` heatmap, `SchedulingEngine`, slot→event | Done |
| 7 | Social feed + likes, comments/replies, event photos, RLS advisor audit, deploy | Done |

### Deployment

- Vercel project: **`nathany333/planner`** (team `personal`), connected to
  GitHub `nathanye333/planner`.
- Production URL: https://planner-eta-umber.vercel.app
- **The deployment 500s at runtime until environment variables are set in
  Vercel** (see [Environment](#environment-variables)). The build itself
  succeeds because all `process.env` reads happen at request time, not build time.

## Tech stack

- **Next.js 16** (App Router, RSC, Server Actions) + **React 19** + TypeScript.
  Note: requested as Next 15; `create-next-app` installed 16. App Router patterns
  are unchanged.
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, Radix primitives).
- **Supabase** — Postgres, Auth, Storage, Realtime. RLS on every table.
- **TanStack Query** for client data + realtime cache invalidation.
- **FullCalendar** for calendar views; **Zod** for validation.
- **Vercel** hosting + Cron (daily calendar sync).

## Architecture & folder map

```
app/
  (marketing)/page.tsx     Public landing
  (auth)/login/            Google sign-in (server page + client button)
  auth/callback/route.ts   OAuth code exchange; stores Google tokens in calendar_connections
  onboarding/              First-run profile setup (server action completeOnboarding)
  (app)/                   Authenticated shell (sidebar, mobile nav, notifications, user menu)
    dashboard/  calendar/  friends/  groups/  groups/[groupId]/
    events/  events/new/  events/[eventId]/  events/[eventId]/edit/
    planners/  planners/new/  planners/[plannerId]/
    feed/  settings/
  api/sync/google/route.ts POST = on-demand sync (signed-in user); GET = Vercel Cron (CRON_SECRET)
components/
  ui/                      shadcn primitives
  app-shell/               sidebar, mobile nav, user menu, nav-items
  events/ groups/ friends/ planner/ feed/ calendar/ notifications/
  action-button.tsx        Wraps a server action: useTransition + toast + router.refresh()
  avatar-upload.tsx cover-upload.tsx user-chip.tsx page-header.tsx
lib/
  supabase/                server.ts | client.ts | admin.ts (service role) | middleware.ts
  auth.ts                  requireUserId / requireProfile (redirects to /login or /onboarding)
  actions/                 friends.ts groups.ts events.ts planners.ts + types.ts (ActionResult/ok/fail)
  scheduling/              engine.ts (SchedulingEngine) + slots.ts (buildAvailabilityInput) + types.ts
  google/                  calendar.ts (fetch/refresh) + mapping.ts (busy→block) + sync.ts (idempotent)
  validations/             profile.ts group.ts event.ts planner.ts (Zod)
  constants.ts format.ts utils.ts types/database.types.ts
proxy.ts                   Auth/session middleware (Next 16 renamed `middleware`→`proxy`)
supabase/migrations/       0001–0008 (see below)
vercel.json                Cron: GET /api/sync/google daily at 06:00 UTC
```

## Database

Migrations in `supabase/migrations/` are **already applied** to the linked
Supabase project (`bmprbjlwzziwnuquobgb`).

| File | Purpose |
| --- | --- |
| `0001_schema.sql` | Enums, tables, indexes, `set_updated_at`, new-user + group-creator triggers |
| `0002_functions.sql` | RLS helpers (`is_friend`, `is_group_member`, `can_view_event`, …) + RPCs (`accept_friend_request`, `remove_friend`) |
| `0003_rls.sql` | Row Level Security policies (all `to authenticated`) |
| `0004_triggers.sql` | Notification + activity-feed triggers on inserts/updates |
| `0005_storage.sql` | Buckets `avatars`, `covers`, `event-photos` + policies |
| `0006_harden.sql` | Pin `search_path`; revoke EXECUTE on trigger/internal fns; tighten storage |
| `0007_realtime.sql` | Realtime publication: notifications, activities, comments, event_rsvps |
| `0008_scope_rpc_to_authenticated.sql` | Revoke RPC/helper EXECUTE from PUBLIC/anon, grant only authenticated |

Core tables: `profiles`, `friend_requests`, `friendships`, `groups`,
`group_members`, `events`, `event_invites`, `event_rsvps`, `availability_blocks`,
`calendar_connections`, `availability_planners`, `planner_participants`,
`comments`, `reactions`, `notifications`, `event_photos`, `activities`.

To change schema: use the Supabase MCP `apply_migration` and **also** add a
matching numbered SQL file here so the repo stays the source of truth. Regenerate
`lib/types/database.types.ts` after schema changes (Supabase MCP
`generate_typescript_types`) — keep the **full** generated output (the
`Relationships` metadata is required for typed embedded queries).

### Privacy & RLS notes

- `availability_blocks` stores only `{ start_at, end_at, status, source,
  external_id, is_override }` — **never titles**. `is_override = true` blocks are
  user-edited and preserved across Google syncs.
- Event visibility (`private` / `friends` / `group` / `public`) is enforced in
  the DB via `can_view_event`. Don't rely on client-side filtering for privacy.
- Remaining Supabase **security advisor warnings are expected and accepted**:
  `0029_authenticated_security_definer_function_executable` for the RLS helpers
  and the two RPCs. They must keep `EXECUTE` for `authenticated` (policies invoke
  the helpers; the app calls the RPCs). There are **no ERROR-level lints**.

## Key conventions

- **Auth in server components:** call `requireProfile()` (or `requireUserId()`)
  at the top — it redirects unauthenticated/unonboarded users.
- **Mutations:** prefer Server Actions in `lib/actions/*` returning
  `ActionResult` (`ok`/`fail`). Trigger them from the client via `<ActionButton>`
  which handles loading, toasts, and `router.refresh()`.
- **Clients:** `lib/supabase/server.ts` (RSC/actions, RLS as user),
  `client.ts` (browser), `admin.ts` (service role — server-only, bypasses RLS,
  used only by the cron sync GET route).
- **Realtime:** client components subscribe via the browser client and
  invalidate the relevant TanStack Query key (see `feed.tsx`,
  `event-comments.tsx`, `notifications-bell.tsx`).
- **Scheduling:** `lib/scheduling/engine.ts` is a pluggable `SchedulingEngine`
  interface (current impl is heuristic: `COMMITTED=0`, `TENTATIVE=0.5`,
  `FREE=1`). Swap in an AI engine here without touching UI.

## Environment variables

Set these in the Vercel project (Settings → Environment Variables) — the
deployment will not function until at least the two public Supabase vars exist.
Values for the public vars are in the local `.env.local`.

| Var | Needed for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Everything | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything | Public anon key |
| `NEXT_PUBLIC_SITE_URL` | OAuth redirects | Set to the production URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron sync (GET /api/sync/google) | **Secret**, server-only |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar sync | Optional until wired |
| `CRON_SECRET` | Protects the cron GET route | Any random string |

After setting vars, redeploy (`vercel deploy --prod`) so they take effect. Then:

1. In **Supabase Auth → URL Configuration**, add `https://<prod-domain>/auth/callback`
   to the allowed redirect URLs (and set Site URL).
2. In **Google Cloud OAuth client**, add the same callback URL (see the setup doc).

## Local development

```bash
npm install
# create .env.local from .env.example (public Supabase values are known)
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint (note: react-hooks/purity flags Date.now()/new Date() in components)
```

The app works without Google credentials — use the manual availability editor.

## Suggested next steps / not yet built

- **Reactions beyond the feed:** `reactions` supports `comment`/`event` targets;
  only activity "likes" are wired in the UI.
- **AI scheduling engine:** implement `SchedulingEngine` with an LLM/optimizer and
  register it in `lib/scheduling/engine.ts`.
- **Notifications UX:** mark-individual-read, pagination (currently mark-all-read).
- **Event cover/feed images:** consider `next/image` (remote pattern for the
  Supabase storage host is already configured in `next.config.ts`).
- **Tests:** no automated tests yet. The scheduling slot logic
  (`lib/scheduling/slots.ts`) and busy→block mapping (`lib/google/mapping.ts`) are
  the highest-value units to cover first.
- **Git:** the repo has **no commits yet**. Commit the working tree before
  relying on Vercel's git integration for auto-deploys.
