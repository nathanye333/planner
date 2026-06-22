# Gather

Social scheduling that respects your privacy. Gather blends the best of
**When2Meet** (automatic availability heatmaps), **TimeTree** (shared group
calendars), and **Partiful** (delightful events + a social feed) — without ever
exposing the private details of what's on your calendar.

The core idea: connect your calendar, and Gather only ever reads coarse
**availability** — `COMMITTED` / `TENTATIVE` / `FREE` — never event titles or
descriptions. Friends and groups can then find the best time to meet
automatically.

## Features

- **Google sign-in + onboarding** — display name, username, timezone, avatar.
- **Friends** — search, request, accept, remove.
- **Groups** — create, invite, roles (admin/member), leave.
- **Availability** — manual editor + Google Calendar sync (busy → `COMMITTED`),
  with per-block manual overrides. Titles are never stored.
- **Shared calendar** — group view overlaying personal availability (privacy
  preserved) with real group events.
- **Events** — cover image, location, visibility (private / friends / group /
  public), invites, and `COMMITTED` / `TENTATIVE` / `DECLINED` RSVPs.
- **Planners** — When2Meet-style heatmap generated automatically from everyone's
  availability, with best-time suggestions and one-click "create event at this
  time".
- **Social feed** — events, RSVPs, group joins, and photo uploads, with likes.
- **Event discussion** — threaded comments + post-event photo memories.
- **Realtime** — live notifications, comments, RSVPs, and feed updates.

## Tech stack

- **Next.js 16** (App Router, RSC, Server Actions) + **React 19** + TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives)
- **Supabase** — Postgres, Auth, Storage, Realtime (RLS on every table)
- **TanStack Query** for client data + realtime cache invalidation
- **FullCalendar** for calendar views
- **Zod** for input validation
- **Vercel** for hosting + Cron (scheduled calendar sync)

## Architecture

```
app/
  (marketing)/         Public landing page
  (auth)/login/        Google sign-in
  auth/callback/       OAuth code exchange + token capture
  onboarding/          First-run profile setup
  (app)/               Authenticated shell (sidebar, nav, notifications)
    dashboard/  calendar/  friends/  groups/  events/  planners/  feed/  settings/
  api/sync/google/     On-demand sync (POST) + Vercel Cron entry (GET)
components/            UI + feature components (shadcn under components/ui)
lib/
  supabase/            server / client / admin / middleware clients
  actions/             Server Actions (friends, groups, events, planners, ...)
  scheduling/          SchedulingEngine abstraction + slot builder
  google/              Calendar fetch + busy→availability mapping + sync
  validations/         Zod schemas
supabase/migrations/   Schema, functions, RLS, triggers, storage, hardening
proxy.ts               Auth/session middleware (Next 16 "proxy" convention)
```

### Privacy model

Availability sync stores only `{ start_at, end_at, status, source, external_id }`
in `availability_blocks` — **no titles or descriptions**. Event visibility is
enforced in the database via RLS using `SECURITY DEFINER` helper functions
(`can_view_event`, `is_friend`, `is_group_member`, …) so access rules cannot be
bypassed from the client.

### Scheduling engine

`lib/scheduling/engine.ts` exposes a `SchedulingEngine` interface with a
heuristic implementation (scores: `COMMITTED=0`, `TENTATIVE=0.5`, `FREE=1`). This
is intentionally pluggable so an AI-backed engine can be swapped in later without
touching the UI.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` (see `.env.example`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-only; used by the cron sync route
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...               # optional until you wire Google Calendar
GOOGLE_CLIENT_SECRET=...
CRON_SECRET=...                    # protects the GET /api/sync/google cron route
```

3. Run the dev server:

```bash
npm run dev
```

The app works without Google credentials — use the manual availability editor.
To enable calendar sync, follow [`docs/GOOGLE_CALENDAR_SETUP.md`](docs/GOOGLE_CALENDAR_SETUP.md).

## Database

Migrations live in `supabase/migrations/` and are already applied to the linked
Supabase project. Order:

| File | Purpose |
| --- | --- |
| `0001_schema.sql` | Enums, tables, indexes, base triggers |
| `0002_functions.sql` | RLS helper functions + RPCs |
| `0003_rls.sql` | Row Level Security policies |
| `0004_triggers.sql` | Notification + activity-feed triggers |
| `0005_storage.sql` | Storage buckets + policies |
| `0006_harden.sql` | search_path pinning + EXECUTE hardening |
| `0007_realtime.sql` | Realtime publication |
| `0008_scope_rpc_to_authenticated.sql` | Restrict RPC/helper EXECUTE to authenticated |

> The remaining `0029` security-advisor warnings (helpers/RPCs callable by
> `authenticated`) are expected: RLS policies must invoke these `SECURITY
> DEFINER` helpers, and the two RPCs are intended for signed-in users.

## Deploy on Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add every variable from `.env.local` to the Vercel project (set
   `NEXT_PUBLIC_SITE_URL` to your production URL).
3. Add the production callback URL to Supabase Auth and the Google OAuth client
   (`https://<your-domain>/auth/callback`).
4. The `vercel.json` cron triggers `GET /api/sync/google` daily at 06:00 UTC
   (guarded by `CRON_SECRET`).
