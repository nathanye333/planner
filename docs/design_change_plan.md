# Gather: Close the gap between the product plan and the existing app

## Context

The user's product plan describes "My Planner" (personal availability) and
"Group Planner" (shared, When2Meet-style, propose/vote/confirm) as the new
shape of the app, alongside unchanged Events and Friends experiences.

Investigation found the backend and most UI for this plan **already exists** —
this repo has iterated past its `docs/HANDOFF.md` snapshot (which is stale).
Database tables/columns for availability sharing, open slots, proposals, and
voting are all live and correctly migrated. A full `ProposalPanel` (👍/👎/🤷,
vote tally, threshold logic, confirm/cancel) already renders on the event
detail page. A `GroupScheduler` + `AvailabilityGrid` heatmap already provides
the When2Meet-style shared view with a "Create event at this time" deep link
into proposal creation.

So this is **not a rebuild** — it's closing specific, verified gaps between
what exists and what the product plan describes, plus fixing one accidental
duplication bug found during investigation. Scope is intentionally tight.

## Key discovery: two personal-availability editors, one broken

`app/(app)/groups/page.tsx` (the "Home" nav destination) already embeds a
fully-correct `<AvailabilityEditor userId={profile.id} groups={groupList} />`
— including the `groups` prop needed for the "share this open slot with
groups" dialog to work.

Separately, `app/(app)/calendar/page.tsx` renders the **same component**
without the `groups` prop, and is not linked from anywhere in the nav
(`components/app-shell/nav-items.ts` has no `/calendar` entry). It's an
orphaned, broken duplicate.

Fix: consolidate into one "My Planner" page rather than patching both.

## Plan

### 1. Nav/IA: "My Planner" becomes the homepage, "Home" relabeled to "Groups"

- Move the "My Calendar" block (the group-fetch query at
  `app/(app)/groups/page.tsx:25-42` + the `<AvailabilityEditor>` card at
  lines 51-58) out of `groups/page.tsx` and into `app/(app)/calendar/page.tsx`,
  replacing what's there now. This fixes the missing-`groups`-prop bug as a
  side effect of reusing the working query. Rename the page heading to
  "My Planner".
- `groups/page.tsx` becomes purely the group list/create/join page (drop the
  availability editor card, keep everything else).
- `components/app-shell/nav-items.ts`: add `{ href: "/calendar", label: "My Planner", icon: CalendarRange }` as the **first** item, and rename the `/groups` entry's label from `"Home"` to `"Groups"`. Order: My Planner, Groups, Events, Friends, Settings — matches the product plan's own ordering and makes "My Planner" the default landing surface, per user decision.
- Check whether anything currently assumes `/groups` is the post-login landing route (e.g. a redirect in `lib/auth.ts` or onboarding completion) and repoint it to `/calendar` if so.
- No changes needed to `components/app-shell/sidebar.tsx` — it just maps over `NAV_ITEMS`.

### 2. Make "manual" vs "auto-mark free" actually different

Currently both the live scheduling paths default an unmarked slot to `free`
for every user unconditionally:
- `lib/scheduling/slots.ts`'s `buildAvailabilityInput` (used by the dormant
  `availability_planners`/`planner_participants` tables — confirm these are
  unused before touching; skip if truly dead)
- `components/groups/group-scheduler.tsx`'s local `buildSlots` (this is the
  one actually driving the live Group Planner grid)

So today there's no real distinction between "manually select" and
"auto-mark free time as available" — gaps are always free. To make the choice
in the product plan meaningful:

- Add `profiles.availability_mode text not null default 'manual' check (availability_mode in ('manual','auto_free'))` via a new migration `supabase/migrations/0014_availability_mode.sql`.
- In `group-scheduler.tsx`'s `buildSlots`, fetch each member's `availability_mode` alongside their profile and change the default-status logic: for a member with no block covering a slot, only default them to `'free'` if their mode is `'auto_free'`; if `'manual'`, omit them from that slot's `participants` array entirely (so `AVAILABILITY_SCORE`/`counts` naturally exclude them — no changes needed to `lib/scheduling/engine.ts` or `types.ts`, since the engine only iterates `slot.participants`).
- Add a `setAvailabilityMode(mode)` action to `lib/actions/availability.ts`, mirroring `setAutoShare`'s shape.
- Add a two-option control ("Manually select available times" / "Automatically mark free time as available") to the existing availability card in `app/(app)/settings/page.tsx`, next to `AutoShareToggle`.

**Open question to confirm with user before/while implementing:** should the
same fix be applied to the dormant `lib/scheduling/slots.ts` path, or is it
genuinely unused and safe to leave alone? (Grep for any live import of
`availability_planners` UI before deciding.)

### 3. Sharing is per-block, and it's a real enforcement boundary

**Important finding that changed this section's scope:** `availability_blocks`
RLS (`supabase/migrations/0003_rls.sql:66`) currently grants read access to
*any* friend or *any* group-mate unconditionally, via `is_friend(...)` /
`shares_group(...)` helper functions — regardless of the `availability_shares`
toggle. That means today's "share with group" switch **doesn't gate anything
at the database level**, and `GroupScheduler`/`FriendScheduleButton` read raw
`availability_blocks` directly with no share check at all. Only the `open`-
status `availability_block_shares` mechanism is actually wired into a query
filter (`group-calendar.tsx`'s green "open slot" overlay), and even that
doesn't gate the Group Planner heatmap itself.

Per user decision, sharing should be **per-block and default-private**: a
block is visible to a group only when explicitly checked for that group, and
users pick a block's shared groups via a checkbox/search list at
creation/edit time (no separate "standing auto-share" preference table needed
— re-selecting the same groups on every new block *is* "sharing indefinitely"
in practice, since the picker remembers nothing between blocks but the user
can quickly re-check the same groups each time).

Changes required:

- **Extend `availability_block_shares`** (`supabase/migrations/0012_block_shares.sql`) via a new migration `0015_availability_sharing.sql` (applied after item 2's `0014_availability_mode.sql`):
  - Add `recipient_type text not null default 'group' check (recipient_type in ('group','friend'))` and repoint `group_id` to a generic `recipient_id uuid` (rename column, update the unique constraint to `(block_id, recipient_type, recipient_id)`), so a block can be shared with friends too, not just groups. Update the existing RLS policies (`block_shares_owner`, `block_shares_group_member_read`) accordingly, and add a `block_shares_friend_read` policy using `is_friend`.
  - Drop the implicit "only `open`-status blocks get a share dialog" restriction in the UI (see below) — any block can carry share rows regardless of status.
- **Flip `availability_blocks` RLS** in the same migration: replace `ab_select`'s `is_friend(...) or shares_group(...)` clause with a check against `availability_block_shares` — visible to self, or if a row exists in `availability_block_shares` matching `(block_id = this block, recipient_type/recipient_id = a group the viewer is in, or the viewer as a friend)`. Write this as a new SECURITY DEFINER helper (e.g. `can_view_block(block_id uuid, viewer uuid)`) alongside the existing helpers in `0002_functions.sql`-style, for consistency and to avoid RLS-recursion issues.
- **`components/calendar/availability-editor.tsx`**: make the group/friend share picker (currently only shown for the `open` painter, lines 146-155 & 271-328) available whenever creating **or editing** any block, regardless of status — extend the picker to list friends alongside groups (currently groups-only). On edit, pre-check whichever groups/friends already have a share row for that block.
- **`lib/actions/availability.ts`**: replace `shareAvailability`/`unshareAvailability`/`getShareStatus` (whole-calendar, now-decorative) with block-scoped equivalents operating on `availability_block_shares`, e.g. `setBlockShares(blockId, targets: {type: 'group'|'friend', id: string}[])` that reconciles inserts/deletes in one call.
- **Drop `availability_shares`** (the whole-calendar grant table) and remove `AvailabilityShareToggle`/`AutoShareToggle` — they provided no real enforcement and are superseded by the per-block picker. Remove `profiles.auto_share_availability` in the same migration. Confirm no other code path depends on this column first (grep before dropping).
- **`components/groups/group-scheduler.tsx`** and **`components/friends/friend-scheduler.tsx`**: change the availability query from `.from("availability_blocks").select(...).in("user_id", memberIds)` to one that goes through RLS as-is (RLS now correctly filters to only shared blocks, so *no query change is strictly required* — the same `select` will simply return fewer rows once RLS is flipped). Double check this is true by testing as a non-member/non-friend user before relying on it; if the heuristic engine needs a participant count independent of visible blocks (it does — `participantCount` is the full member list, not just those who shared), confirm `AVAILABILITY_SCORE`/`counts` still degrade gracefully when a member has zero visible blocks (they should just always read as the "omitted from participants" case from item 2, not a false "free").

**"Share with all my groups at once" bulk action, revised:** since there's no
whole-calendar grant anymore, this becomes: for every one of the user's
*existing* blocks that currently has zero share rows, bulk-insert
`availability_block_shares` rows for all of the user's current groups. Place
the button on the consolidated My Planner page (`/calendar`). This does not
affect future blocks — each new block still goes through the same
create-time picker (per user decision, no persistent auto-share flag).

**Open question to confirm with user before implementing:** should the
one-time "share all" bulk action skip blocks that already have *some* share
rows (only filling in the gap for fully-unshared blocks), or should it add
the user's groups to every block's share list regardless of what's already
there (additive, never removes an existing narrower share)? Recommend the
latter (additive) since it's less surprising and never silently narrows an
existing share.

### 4. Propose-from-grid: pass group context, default to proposal, show it visually

- `components/planner/availability-grid.tsx`: thread an optional `groupId` prop through (only `GroupScheduler` needs to pass it), and append `&group=${groupId}` to the existing "Create event at this time" link (currently only passes `start`/`end`/`title`). `app/(app)/events/new/page.tsx` already reads `group` and pre-selects group visibility — no further change needed there for this part.
- `components/events/event-form.tsx`: currently hardcodes `useState(false)` for `isProposal` (line 57). Add an optional `defaultIsProposal?: boolean` prop; `app/(app)/events/new/page.tsx` should pass `true` when both `group` and `start`/`end` params are present (arriving from a planner slot pick), `false` otherwise — preserves today's default for the plain "New event" flow.
- `components/calendar/group-calendar.tsx`: the `groupEvents` query (lines 30-33) selects `id, title, start_at, end_at` only — add `status`. In the `eventItems` mapping (lines 47-55), branch on `status === 'proposed'` to apply a new `status-proposed` class instead of the plain primary-color styling.
- `app/globals.css`: add a `.fc .status-proposed` rule near the existing `.status-open` rule (line 134-138, which already uses `border-style: dashed` as a working precedent) — muted color + dashed border, per the product plan's "muted or dashed style" requirement.

**Optional, flagged but not required:** give `status === 'cancelled'` events distinct treatment in the same file while touching it — currently indistinguishable from confirmed. Defer unless the user wants it in this pass.

### 5. Percentage-of-members on the proposal panel

- `app/(app)/events/[eventId]/page.tsx`: pass a new `memberCount` prop to `ProposalPanel`, computed as `invites.length + 1` (invitees + creator, using the invites array already fetched at line ~52). This matches "everyone this proposal was sent to" for both group proposals (where `createEvent` auto-invites all group members, `lib/actions/events.ts:126-131`) and friend-only proposals.
- `components/events/proposal-panel.tsx`: accept `memberCount`, and add a new line below the existing votes-cast bar: `{yes} of {memberCount} members said yes ({pct}%)`. Keep the existing bar's votes-cast-based math as-is (it's a reasonable "of those who responded" view) — add the members-based percentage as a second data point rather than replacing the bar, so early votes don't visually overstate consensus.

### 6. Verify (no code expected) + optional polish

- Confirm events list surfacing: `app/(app)/events/page.tsx` queries by `creator_id` OR `event_invites` membership with no `status` filter — proposed events already appear in every invitee's list from creation, and stay there through `confirmEvent`. No change needed.
- Optional polish (defer if scope needs to stay tight): add a small "Proposed" badge to `components/events/event-list-item.tsx` when `event.status === 'proposed'`, reusing the badge styling already in `proposal-panel.tsx:76`, so an unconfirmed proposal doesn't look identical to a locked-in event in the list view.

## Explicitly out of scope

- Friends feature (requests/accept/decline/list): already matches the plan as-is, no changes.
- Events feature (create/RSVP/comments/reactions/photos): already matches the plan as-is, no changes beyond items 4–5 above.
- `ProposalPanel`'s vote mechanics, `AvailabilityGrid`'s heatmap rendering, and the Google Calendar sync pipeline (`lib/google/*`) — these already work correctly and are not being rewritten. (`GroupScheduler`/`FriendScheduleButton` are touched, but only to rely on the corrected RLS boundary from item 3 — no logic rewrite.)

## Verification

1. `supabase db lint --linked` after adding migrations 0014/0015 → no errors; `supabase migration list --linked` shows them applied on both sides.
2. Regenerate `lib/types/database.types.ts` via Supabase MCP/CLI after schema changes and confirm it includes `availability_mode` and the updated `availability_block_shares` shape, and no longer references `availability_shares`/`auto_share_availability` once dropped.
3. **Privacy regression check (highest priority, since this changes an access-control boundary):** as User A, create a block and do NOT share it with User B's group. Log in as User B (or use a second browser/service-role query simulating B's RLS context) and confirm the block is **not** returned by any query — directly via `availability_blocks` select, via `GroupScheduler`'s heatmap, and via `FriendScheduleButton`. Then share it with B's group and confirm it becomes visible in all three places. Repeat for the friend case.
4. Manual walkthrough in dev (`npm run dev`):
   - `/calendar` shows "My Planner"; creating or editing any block (not just "open") shows a group/friend share picker, pre-checked correctly on edit.
   - Nav shows "My Planner" (first) and "Groups" as separate items.
   - Settings: toggle availability mode to "auto_free" on a test user; confirm their gaps show as free in a group's "Find a time" grid, and a "manual" user's gaps do not count toward the slot's free tally.
   - "Share with all groups" button on My Planner adds share rows for every current group to every existing block, additively, without removing narrower existing shares.
   - From a group's "Find a time" grid, click "Create event at this time" → new event form opens pre-filled with group + times + proposal mode already on.
   - Confirm the resulting proposed event shows dashed/muted on `GroupCalendar`, and the event detail page's `ProposalPanel` shows the new "X of Y members said yes (Z%)" line.
   - Confirm the proposal (as creator) and confirm it appears as a normal (non-dashed) event in every invitee's `/events` list.
5. `npm run build && npm run lint` clean, per existing repo conventions.
