# React Migration Record

Statto has been migrated from the original Expo app to a browser-first React app in `web/`.

## Outcome

- The Expo route tree and React Native component layer have been removed.
- The Vite app in `web/` is now the only supported runtime.
- Shared business logic remains in root `lib/`.
- Club auth, club access, local persistence, and Supabase sync all run through the web app.

## Shared Modules Kept In Root

- `lib/attendance.ts`
- `lib/availability.ts`
- `lib/club-data-snapshot.ts`
- `lib/club.ts`
- `lib/fines.ts`
- `lib/fitness.ts`
- `lib/match-stats.ts`
- `lib/team-csv.ts`
- `lib/team.ts`
- `lib/types.ts`
- `lib/votes.ts`
- `lib/mock-data/*`

## Web App Runtime

- `web/src/app/*`
- `web/src/routes/*`
- `web/src/components/*`
- `web/src/lib/*`
- `web/src/styles/global.css`

## Cutover Notes

- Vercel should use `web` as the project root.
- Supabase client env vars now use `VITE_*`.
- SPA rewrites are configured in `web/vercel.json`.

## Remaining Follow-Up

- Optional bundle splitting to reduce the Vite chunk-size warning.
- Optional visual QA sweep after deployment.
