---
name: statto-cloud-sync
description: Use in the Statto repo when working on shared club data sync, Supabase Realtime, optimistic updates, cloud refresh races, stale snapshots overwriting local edits, or persistence/convergence bugs in club data.
---

# Statto Cloud Sync

Use this for Statto bugs where admin/player edits save locally, sync to Supabase, refresh from Supabase, or converge across browsers.

## First Checks

- Read `web/src/lib/club-data-context.tsx` and the relevant storage helper in `web/src/lib/storage/cloud-core-data-storage.ts`.
- Treat `supabase/schema.sql` as the schema source of truth.
- For remote verification, use `supabase db query --linked` when authenticated.
- Distinguish three paths before changing code:
  - initial hydration from cloud
  - local optimistic edit plus Supabase write
  - cross-browser convergence through Realtime or refresh

## Race Condition Rule

Do not fix write races by adding more full snapshot reloads.

Preferred edit path:

1. Apply the local optimistic state update.
2. Send only the changed row, rows, or delete to Supabase.
3. Treat the Supabase success/failure response as the result for that local edit.
4. On success, do not immediately reload the full club snapshot.
5. On failure, surface the sync error and keep the UI in a known state.

Use full cloud refresh only for initial hydration, focus/visibility catch-up, periodic reconciliation, explicit manual refresh, or recovery after a known sync failure.

## Realtime Pattern

Realtime should converge targeted row changes, not replace the whole club snapshot.

- Subscribe per table where practical.
- Map `INSERT` and `UPDATE` payloads into collection-specific row patches.
- Map `DELETE` payloads into collection-specific removals.
- Remember Supabase delete payloads can be limited to primary-key fields under RLS.
- Ignore or de-duplicate events that correspond to the browser's own confirmed optimistic write when the local state is already current.
- Keep collection normalizers close to the existing `ClubDataSnapshot` normalization path so Realtime and hydration produce the same shape.

## Stale Snapshot Guard

If a full refresh is still needed near writes, guard it with a write generation, pending-write counter, or collection-level "local write after refresh started" check. A refresh started before a later local write must not overwrite that later local edit.

## Hydration And I/O Rule

Keep club-wide hydration light. Do not load heavy JSON fields such as full training `session_plan` or `run_plan` data during routine app refreshes, focus refreshes, or dashboard loads.

Preferred pattern:

1. Hydrate list views with summary fields needed for scheduling, status, and navigation.
2. Add targeted indexes for measured hot paths, especially `(club_id, date)` filters on dated club tables.
3. Lazy-load heavy detail fields only when the user opens the specific record detail or edit screen.
4. Verify Supabase disk I/O work with `pg_stat_statements` shared block reads/writes before and after the change when remote access is available.

## Validation

For sync changes, run:

```bash
npm --prefix web run typecheck
npm --prefix web run build
```

When possible, test the user workflow that triggered the issue:

- rapid match selection changes across several players
- lineup position changes while other edits are still syncing
- availability changes including `not responded`
- two-browser convergence when Realtime is involved

If authenticated browser validation is blocked, state that explicitly and mark remote UI persistence as unverified.
