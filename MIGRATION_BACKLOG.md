# React Migration Backlog

This backlog is the working plan for moving Statto from the current Expo app to a browser-first React app while keeping the Expo app operational during the migration.

## Strategy

- Build the React app alongside Expo in `web/`.
- Reuse pure domain logic from root `lib/`.
- Rebuild navigation, providers, and UI as web-native code.
- Migrate the highest-value flows first, then cut over once parity is acceptable.

## Shared Vs Web-Only Map

### Reuse from root

- `lib/attendance.ts`
- `lib/availability.ts`
- `lib/club.ts`
- `lib/club-data-snapshot.ts`
- `lib/fines.ts`
- `lib/fitness.ts`
- `lib/match-stats.ts`
- `lib/team.ts`
- `lib/team-csv.ts`
- `lib/types.ts`
- `lib/votes.ts`
- `lib/mock-data/*`

### Replace in web

- `app/**` with `web/src/routes/**`
- `components/**` with web-native components and CSS
- `lib/supabase.ts` with `web/src/lib/supabase.ts`
- `lib/auth-context.tsx` with `web/src/lib/auth-context.tsx`
- `lib/club-access-context.tsx` with `web/src/lib/club-access-context.tsx`
- `lib/club-data-context.tsx` with `web/src/lib/club-data-context.tsx`
- `lib/settings-context.tsx` with `web/src/lib/settings-context.tsx`
- `lib/storage/**` with browser storage helpers in `web/src/lib/storage/**`

## Route Backlog

### Foundation

- [x] Create standalone `web/` app scaffold
- [x] Add app shell, router, and provider composition
- [x] Add web theme + settings support
- [x] Add web Supabase client
- [x] Add web auth gate and club-access gate
- [x] Port home route using shared selectors

### Core Flows

- [x] Port `/training`
- [x] Port `/training/:sessionId`
- [x] Port `/matches`
- [x] Port `/matches/:fixtureId`
- [x] Port `/matches/:fixtureId/stats`
- [x] Port `/matches/:fixtureId/votes`

### Admin Flows

- [x] Port `/admin`
- [x] Port `/admin/team`
- [x] Port `/admin/training`
- [x] Port `/admin/matches`
- [x] Port `/admin/fines`
- [x] Port `/admin/votes`
- [x] Port `/admin/fitness`
- [x] Port `/admin/settings`
- [x] Port `/admin/club`

## Execution Order

### Phase 1: Foundation

- Create `web/package.json`
- Add Vite + React + TypeScript config
- Add root scripts for `web:dev`, `web:build`, and `web:typecheck`
- Add CSS tokens and top-level layout

### Phase 2: Shared State

- Port settings context to browser APIs
- Port auth context to browser-only Supabase config
- Port club access context to browser storage + web Supabase
- Port club data context to browser storage + cloud sync

### Phase 3: Feature Routes

- Port Home first for a real end-to-end slice
- Port Training list and detail
- Port Matches list and detail
- Port match stats and votes

### Phase 4: Admin Workflows

- Team management with CSV upload
- Training session management
- Fixture management
- Fines, votes, fitness, settings, club access

### Phase 5: Cutover Readiness

- Verify auth flow
- Verify club switching
- Verify local persistence
- Verify Supabase sync
- Verify responsive layouts
- Update docs and deployment

## Initial File Map

### Added in this slice

- `web/package.json`
- `web/index.html`
- `web/tsconfig.json`
- `web/tsconfig.node.json`
- `web/vite.config.ts`
- `web/src/main.tsx`
- `web/src/vite-env.d.ts`
- `web/src/styles/global.css`
- `web/src/app/app.tsx`
- `web/src/app/router.tsx`
- `web/src/app/shell-layout.tsx`
- `web/src/app/providers/app-providers.tsx`
- `web/src/lib/theme.ts`
- `web/src/lib/supabase.ts`
- `web/src/lib/storage/local-storage.ts`
- `web/src/lib/storage/cloud-core-data-storage.ts`
- `web/src/lib/settings-context.tsx`
- `web/src/lib/auth-context.tsx`
- `web/src/lib/club-access-context.tsx`
- `web/src/lib/club-data-context.tsx`
- `web/src/routes/auth-screen.tsx`
- `web/src/routes/club-access-screen.tsx`
- `web/src/routes/home-screen.tsx`
- `web/src/routes/route-placeholder.tsx`

### Next recommended files

- `web/src/routes/training/training-list-route.tsx`
- `web/src/routes/training/training-detail-route.tsx`
- `web/src/routes/matches/matches-list-route.tsx`
- `web/src/routes/matches/match-detail-route.tsx`
- `web/src/routes/matches/match-stats-route.tsx`
- `web/src/routes/matches/match-votes-route.tsx`
- `web/src/routes/admin/admin-home-route.tsx`
- `web/src/routes/admin/team-route.tsx`

## Risks To Watch

- `BrowserRouter` will need SPA rewrite support in deployment.
- Existing Expo-native local file flows such as CSV import need explicit browser replacements.
- Root storage helpers are not portable as-is because they import `react-native` and Expo file APIs.
- UI parity will take more work than data parity because the current screen layer is almost entirely React Native.
