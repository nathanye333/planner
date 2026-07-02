# Verification checklist: My Planner / Group Planner redesign

Test cases derived from `docs/design_change_plan.md`, to be executed after
implementation. No automated test runner exists in this repo (no
vitest/jest/playwright); checks are split into what I can run directly
(SQL via Supabase MCP, `npm run build`, `npm run lint`, `supabase db lint`)
and manual UI steps for the developer to walk through in a browser.

Status column is filled in after each check is run.

## Known gaps (not yet complete)

1. **General UI/UX polish is incomplete.** Several iterations landed
   mechanical/functional correctness (RLS, data flow, form wiring) but the
   surrounding UI has not had a full design pass — spacing, empty states,
   loading states, and visual hierarchy across `/calendar`, the group detail
   page, and the inline event-creation panel should be revisited before
   calling this feature done.
2. **Group shared-availability UI/UX is incomplete.** The When2Meet-style
   heatmap (`GroupScheduler` → `AvailabilityGrid`) exists and is functionally
   correct against the new per-block sharing model, but it's tucked behind a
   collapsed "Find a time" button and easy to miss; it doesn't clearly
   communicate *why* a member shows no data (not shared vs. actually busy),
   and there's no obvious link between "my calendar" and "what my groups can
   see" — a user has no single place to review what's currently shared with
   which group. This needs a real design pass, not just wiring.

## A. Migrations

| # | Check | Method | Status |
|---|-------|--------|--------|
| A1 | `0014_availability_mode.sql` and `0015_availability_sharing.sql` apply cleanly | `apply_migration` via MCP | ✅ Pass — both applied without error |
| A2 | `supabase migration list --linked` shows 0014/0015 applied remotely | CLI / MCP `list_migrations` | ✅ Pass — versions `20260702003655` (availability_mode), `20260702003834` (availability_sharing) present |
| A3 | No new *class* of security/performance advisories introduced beyond existing patterns | MCP `get_advisors` | ✅ Pass — new `can_view_block` warnings mirror the exact pre-existing pattern on `is_friend`/`can_view_event`/etc. (all SECURITY DEFINER helpers show the same anon/authenticated RPC-exposure warning); `auth_rls_initplan`/`multiple_permissive_policies` on `availability_block_shares` match the same warnings already present on `events`, `groups`, `comments`, etc. Not a regression. |
| A4 | Existing 3 `availability_block_shares` rows survive the `group_id`→`recipient_id` rename with `recipient_type='group'` | SQL query pre/post migration | ✅ Pass — all 3 rows preserved with correct `recipient_type` |
| A5 | `availability_shares` table and `profiles.auto_share_availability` column no longer exist post-migration | SQL query / generated types | ✅ Pass — confirmed absent from regenerated `database.types.ts` |

## B. `profiles.availability_mode`

| # | Check | Method | Status |
|---|-------|--------|--------|
| B1 | New profiles default to `'manual'` | SQL: checked all 4 existing profiles | ✅ Pass — all defaulted to `'manual'` after migration |
| B2 | Only `'manual'` / `'auto_free'` accepted; other values rejected by CHECK constraint | SQL: inspected `pg_constraint` definition | ✅ Pass — `CHECK ((availability_mode = ANY (ARRAY['manual'::text, 'auto_free'::text])))` present |
| B3 | `setAvailabilityMode` action updates the column for the caller only | Code review: `.eq("id", userId)` scoped to authed user | ✅ Pass by inspection — not exercised live (needs a session) |
| B4 | Settings page shows a two-option control reflecting current mode | Manual UI | ⬜ Manual — see walkthrough below |

## C. Manual vs auto-mark-free distinction (`group-scheduler.tsx`)

| # | Check | Method | Status |
|---|-------|--------|--------|
| C1 | Member with `availability_mode='auto_free'` and no block covering a slot → counted as `free` in that slot's tally | Manual: set mode, open group "Find a time", inspect counts | ⬜ Manual |
| C2 | Member with `availability_mode='manual'` and no block covering a slot → omitted from that slot's participants (not counted as free or any status) | Manual: same as C1 with manual mode | ⬜ Manual |
| C3 | Heatmap degrades gracefully (no crash, no false 100% free) when a manual-mode member has zero visible blocks | Manual: verify heatmap renders sane colors | ⬜ Manual |
| C4 | Dormant `lib/scheduling/slots.ts` / `buildAvailabilityInput` intentionally left unchanged (confirmed dead — no importer) | Static: grepped `lib/actions/planners.ts` importers | ✅ Pass — zero importers found, confirmed with user before implementation |

## D. Per-block sharing (biggest risk area — privacy boundary)

| # | Check | Method | Status |
|---|-------|--------|--------|
| D1 | **Privacy regression, block not shared:** a friend+group-mate of the block owner cannot view an unshared block via `can_view_block`/RLS | SQL via MCP, live data (`can_view_block` direct call) | ✅ **Pass — this is the critical result.** Viewer `29236edb...` is both `is_friend=true` and `shares_group=true` with owner `abca271f...`, yet `can_view_block` on an unshared block returned `false`. Old RLS (`is_friend(...) or shares_group(...)`) would have leaked this. |
| D2 | Same block, after sharing with viewer's group → block IS visible | SQL (transaction, rolled back — no data mutated) | ✅ Pass — `can_view_block` flipped to `true` after inserting a `group` share row |
| D3 | Friend-type share: visible to the specific friend only, not other friends | SQL (transaction, rolled back) | ✅ Pass — shared friend saw `true`, a different friend saw `false` |
| D4 | `GroupScheduler` heatmap: unshared blocks don't contribute to counts | Code review: relies on RLS filtering `.in("user_id", memberIds)` results | ✅ Pass by inspection — confirmed via D1/D2 that RLS filters correctly; combined with item C's fix (manual-mode + zero visible blocks → omitted from participants, not defaulted free) |
| D5 | `GroupScheduler` heatmap after share: block appears/contributes | Same as D4 | ✅ Pass by inspection |
| D6 | `FriendScheduleButton` respects the same boundary | Code review: identical query pattern, same RLS applies | ✅ Pass by inspection |
| D7 | `can_view_block` does not recurse / error under RLS | SQL: called directly multiple times without error | ✅ Pass — no recursion errors, `SECURITY DEFINER` + `set search_path = public` matches existing helper pattern |
| D8 | Creating **any** block (not just "open") shows the share picker | Code review: `AvailabilityEditor`'s `handleSelect` now always opens the picker dialog regardless of `painter` status | ✅ Pass by inspection — verify visually in walkthrough |
| D9 | Editing pre-checks existing shares | Code review: `handleEventClick` now calls `getBlockShares` and seeds `editShares` | ✅ Pass by inspection |
| D10 | `setBlockShares` reconciles inserts/deletes in one call | Code review: deletes all existing shares for the block then re-inserts the target set | ✅ Pass by inspection (delete-then-insert is correct for small share lists) |
| D11 | IDOR: `setBlockShares` can't add a share for a group the caller isn't in | Code review only — live DB only has 2 groups and the test user is in both, so a live negative test isn't possible without adding fixtures to a shared dev DB | ⚠️ Not live-tested — policy logic (`block_shares_owner_insert`) is a direct extension of the pre-existing, already-hardened 0013 policy (group-membership check), same shape for the new friend branch (`is_friend` check) |
| D12 | "Share with all groups" is additive, never narrows | Code review: `shareAllBlocksWithAllGroups` only inserts via `upsert(..., ignoreDuplicates: true)`, never deletes | ✅ Pass by inspection |
| D13 | Bulk action button lives on `/calendar` | Code review: `ShareAllBlocksButton` rendered in `CalendarPage`'s `PageHeader` action slot | ✅ Pass |

## E. Propose-from-grid

| # | Check | Method | Status |
|---|-------|--------|--------|
| E1 | Group grid's "Create event at this time" link includes `&group={groupId}` | Code review: `AvailabilityGrid` appends `&group=` only when `groupId` prop is set; `GroupScheduler` passes it | ✅ Pass |
| E2 | Friend scheduler link has no `group` param | Code review: `FriendScheduleButton` doesn't pass `groupId` to `AvailabilityGrid` | ✅ Pass |
| E3 | New event form pre-enables proposal mode when `group` + `start`/`end` present | Code review: `defaultIsProposal = !!(group && startParam && endParam)` | ✅ Pass |
| E4 | Plain "New event" flow still defaults `isProposal=false` | Code review: `defaultIsProposal` defaults to `false` when prop omitted | ✅ Pass |
| E5 | `GroupCalendar` shows proposed events with `.status-proposed` | Code review: query now selects `status`, `eventItems` mapping branches on `status === 'proposed'` | ✅ Pass by inspection — verify visually in walkthrough |

## F. Percentage-of-members on proposal panel

| # | Check | Method | Status |
|---|-------|--------|--------|
| F1 | `memberCount` = `invites.length + 1` | Code review: passed from `EventDetailPage` | ✅ Pass |
| F2 | Panel shows "X of Y members said yes (Z%)" as a second line | Code review: new line added below existing bar, doesn't replace it | ✅ Pass |
| F3 | Percentage math edge cases: 0 votes → 0%; all yes → 100%; memberCount always ≥1 (creator included) so no div-by-zero | Code review + arithmetic check | ✅ Pass — `Math.round((0/N)*100)=0`, `Math.round((N/N)*100)=100`, `memberCount` can't be 0 |

## G. Nav / IA

| # | Check | Method | Status |
|---|-------|--------|--------|
| G1 | `/calendar` renders "My Planner", uses groups-aware `AvailabilityEditor` | Code review | ✅ Pass |
| G2 | `/groups` no longer shows availability editor | Code review | ✅ Pass |
| G3 | Nav order: My Planner, Groups, Events, Friends, Settings | Code review: `NAV_ITEMS` array order | ✅ Pass |
| G4 | Post-login redirects land on `/calendar` | Code review: all 4 call sites (`auth/callback`, `login`, `onboarding/actions`, `onboarding/page`) updated | ✅ Pass |
| G5 | Sidebar logo + root-path highlighting follow new landing route | Code review: both `Sidebar` and `MobileNav` updated | ✅ Pass |

## H. Regressions / out-of-scope guards

| # | Check | Method | Status |
|---|-------|--------|--------|
| H1 | Proposed events still appear in every invitee's `/events` list | Code review: `events/page.tsx` query unchanged, no status filter | ✅ Pass — untouched code path |
| H2 | Friends feature unaffected | Code review: no friends-feature files touched except read-only additions (friend list fetch for the share picker) | ✅ Pass |
| H3 | `npm run build` succeeds | Automated | ✅ Pass — clean build, all routes compiled, TypeScript passed |
| H4 | `npm run lint` clean | Automated | ✅ Pass — 1 pre-existing unused-var warning in `event-form.tsx` (confirmed present before this change via `git show HEAD`), no errors |
| H5 | `supabase db lint --linked` no errors | Automated | ✅ Pass — "No schema errors found" |

## Post-implementation fix: RLS bug on block creation with sharing

**Reported symptom:** "Something went wrong" when adding a free slot and selecting a group to share it with.

**Root cause:** the original `0015` migration's `ab_select` policy (`using (can_view_block(id, auth.uid()))`) delegated entirely to a `STABLE` SECURITY DEFINER function. PostgREST inserts always request `RETURNING`, which re-evaluates the SELECT policy against the just-inserted row in the same statement. The `STABLE` function's internal query did not consistently observe that row, so `INSERT ... RETURNING` on `availability_blocks` failed with "new row violates row-level security policy" even for the owner viewing their own new block — reproduced directly via SQL with `set local role authenticated` + `request.jwt.claims`.

**Fix (`0016_fix_block_select_rls.sql`):** split `ab_select` into an inline `user_id = auth.uid()` self-check (fast path, no function indirection, always sees the just-inserted row) OR'd with a SECURITY DEFINER helper `is_block_shared_with(id, auth.uid())` that only handles the friend/group share case (still needs SECURITY DEFINER to query `availability_block_shares` without triggering RLS-policy recursion between the two tables). Replaced `can_view_block` with this narrower function since nothing else called it.

**Verified via SQL (rolled back, no data mutated):**
- `INSERT ... RETURNING id` on `availability_blocks` as the owner now succeeds (previously failed).
- Privacy boundary re-confirmed intact: `is_block_shared_with` still returns `false` for an unshared block viewed by a friend/group-mate.
- Sharing a block immediately after creating it (as two separate statements, matching the app's two separate Supabase client calls) now succeeds end-to-end.
- `supabase db lint --linked` and `npm run build`/`npm run lint` all still pass clean after the fix.

## Summary

- **Automated/SQL checks: all passed.** The highest-priority item — the privacy boundary flip in D1/D2/D3 — was verified live against real data in the linked Supabase project (via rolled-back transactions, no data mutated) and confirmed the exact regression the plan called out: a friend/group-mate who previously had blanket read access can no longer see an unshared block.
- **D11 (IDOR on group-share insert)** could not be live-tested because the dev database only has 2 groups and the test user belongs to both — no "outsider" group exists without adding fixtures to a shared, real-data database. Confidence is high by code inspection since the policy directly extends the already-hardened 0013 migration's shape.
- **Manual UI items (B4, C1-C3, D8-D9/E5 visual confirmation)** require a running dev server and browser session, which this session cannot drive. Walkthrough steps below are precise enough to execute directly.

## Manual walkthrough (for the developer)

1. Run `npm run dev`, sign in.
2. Go to Settings → confirm "How should your open time count in group planners?" shows two options, defaulting to "Manually select" — click "Automatically mark free time as available" and confirm it saves (toast, no error).
3. Go to My Planner (`/calendar`) — confirm nav shows "My Planner" first, then "Groups", "Events", "Friends", "Settings".
4. On My Planner, drag-select a new time block — confirm a dialog appears with a group/friend share picker for **every** status (try "Free" and "Committed", not just "Open").
5. Click an existing block — confirm the edit dialog shows the share picker pre-checked with whatever it's currently shared with.
6. Click "Share with all groups" — confirm a success toast, and spot-check in Supabase that share rows were added for all your blocks/groups without removing any existing narrower share.
7. Go to a group page → "Find a time" → hover a slot with overlap → click "Create event at this time" — confirm the URL has `&group=...` and the new event form opens with the proposal toggle already on.
8. Submit that proposal, go to the group calendar view — confirm it renders dashed/muted, not solid primary color.
9. Open the proposed event's detail page — confirm the "X of Y members said yes (Z%)" line appears below the vote bar.
10. As a second user who is a friend/group-mate of the first but NOT shared a particular block, confirm that block does not appear in their "Find a time" heatmap or friend scheduler.
