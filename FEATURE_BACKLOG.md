# Feature and Fix Backlog

This backlog is the working source of truth for product work needed to complete, harden, and release Statto features.

Use this at the start of each work session to:
- pick the next item by priority
- add new requests
- change priority or scope
- record implementation progress
- preserve release checks and open questions

## Priority Legend

- `P0`: Blocking release or core club operation.
- `P1`: Important for the next useful release.
- `P2`: Valuable improvement, but not release-blocking.
- `P3`: Later polish, optimization, or nice-to-have.

## Status Legend

- `Proposed`: needs scope confirmation before implementation.
- `Defined`: scope and acceptance criteria are clear enough to start.
- `In progress`: implementation has started but is not release-ready.
- `Needs validation`: code exists, but release confidence needs QA, data checks, or production verification.
- `Ready`: implemented, validated, and ready to release.
- `Released`: shipped and verified in production.

## Working Rules

- Keep each backlog item stable by ID.
- Add new requests under `New Intake` first if they need triage.
- Update `Current next step` after every meaningful work session.
- Move scope out of an item only when it is genuinely a separate deliverable.
- Prefer small release slices over one large feature branch.

## Priority Order

1. `ST-005` League and club policy settings
2. `ST-001` User/admin flow
3. `ST-003` Training session setup and management
4. `ST-002` Player goal setting
5. `ST-007` Match stats reporting
6. `ST-004` Games played by grade
7. `ST-009` Visual QA sweep
8. `ST-006` Player fines management
9. `ST-008` Bundle splitting

## Backlog Items

### ST-001 User/Admin Flow

Priority: `P1`
Status: `Partially implemented`

Problem:
Club setup and account access are foundational. Admins need confidence that users can sign in, recover accounts, accept invites, receive the correct role, and land in the right admin or player experience without manual cleanup.

Outcome:
Admins can manage access end to end, while players and coaches can get into the app reliably with clear recovery paths and role-safe navigation.

Primary users:
- Club admin
- Coach
- Player

Scope:
- In-app password reset request, callback handling, expired-link handling, and post-reset sign-in path.
- Invite acceptance flow for admins, coaches, and players.
- Pending invite status, resend, and cancel controls for admins.
- Admin role assignment and role update review using the existing `admin`, `coach`, and `player` roles.
- Player-account linking and missing-link handling.
- Admin/player view switching in the shell.
- Clear unauthorised, expired invite, missing session, and missing club states.
- Production auth configuration review for redirect URLs and email templates.

Out of scope for first release:
- Full audit log for every auth action.
- Multi-club enterprise administration beyond the current club switching model.
- Self-service role elevation.
- New role types such as owner or super-admin.

Acceptance criteria:
- A user can request a password reset and set a new password from the emailed link inside the app.
- Reset links land back in the web app and show a useful error if expired or invalid.
- Admins can invite users, resend pending invites, cancel pending invites, assign roles, link player accounts, and restrict squads.
- Player-only users cannot reach admin-only screens by URL.
- Coaches can only manage allowed squads.
- Admin-capable users can switch between admin view and player view and choose the player profile they are viewing as.
- Sign-out clears session state and returns to the correct auth screen.

Validation plan:
- Production-style manual test with one admin, one coach, and one player account.
- Supabase Auth redirect URL check.
- Password reset request, callback, success, expired-link, and invalid-link tests.
- Invite accept, resend, cancel, and pending-status tests.
- RLS smoke test for admin, coach, and player permissions.
- Browser test of direct URL access to admin-only and player-only routes.

Dependencies:
- Supabase Auth configuration.
- `club_memberships` and player link data.
- `club_member_invites` and invite Edge Function behavior.
- Existing `PlayerProfileProvider` and `ClubAccessProvider`.

Risks and decisions:
- Password reset callback handling may need a dedicated route if Supabase redirects are awkward.
- Invite and reset email copy may need production-domain setup before final validation.
- Coach/player permission bugs can be subtle because UI gating and RLS both matter.
- Release readiness depends on production-style account tests, not just code completion.

Current next step:
- Run production-style invite, password reset, and response reminder email validation with the hosted Supabase Auth SMTP and Resend settings.

Implementation notes:
- Added in-app password reset request and recovery-session password update screens.
- Added useful expired/invalid reset-link messaging when Supabase redirects back with an auth error.
- Added branded Supabase Auth templates for invite, confirmation, and password recovery emails.
- Added local Supabase Auth SMTP config placeholders that read from root `.env` values instead of browser-exposed Vite env values.
- Added an admin-triggered response reminder flow that emails linked players with outstanding future training or match responses through a Supabase Edge Function and Resend.
- Hosted email settings still need end-to-end validation with real invite, reset, and reminder recipients.

### ST-002 Player Goal Setting

Priority: `P1`
Status: `Partially implemented`

Problem:
Coaches need player development goals to be specific, persistent, easy to revisit week to week, and selectively shareable with players. The existing player development flow needs hardening before it can be treated as release-ready.

Outcome:
Coaches can set season goals, create private weekly focus items, review progress history, and optionally use AI support. Players can see their published season goals, acknowledge them, and leave a short comment without seeing coach-only notes.

Primary users:
- Coach
- Club admin
- Player

Scope:
- Season goals and skill summary per player.
- Coach-private weekly focus tasks, coaching notes, progress status, proficiency, and progress note.
- Player-facing season goal view.
- Player acknowledgement and short comment/reflection on visible season goals.
- Current-week editing and previous-week review for coaches/admins.
- AI-assisted draft generation where Supabase functions and OpenAI are configured.
- Clear dirty-state handling when switching player or week.
- Save/error/loading states for profile, weekly focus, and player acknowledgement sections.

Out of scope for first release:
- Player editing of coach-authored development goals.
- Player visibility into weekly focus items or coach-private notes.
- Notifications or automated reminders.
- Advanced reporting across the whole squad.
- AI as a required dependency for releasing manual goal-setting workflows.

Acceptance criteria:
- Coaches can select a player and edit season-level development fields.
- Coaches can create or update a private weekly focus for the selected player.
- Players can view their season goals, acknowledge them, and save a short comment.
- Saved data persists to Supabase and refreshes across devices.
- Switching players or weeks does not silently discard unsaved edits.
- AI generation handles missing session, missing function config, and incomplete responses with useful errors.
- Past weeks can be reviewed without accidentally changing the current week.

Validation plan:
- Typecheck.
- Manual coach save/refresh test across two browser sessions.
- Manual player goal acknowledgement/comment test.
- Manual player/week switching dirty-state test.
- Edge Function happy-path and failure-path test if OpenAI config is present.

Dependencies:
- `club_player_development_entries`.
- Player profile fields on `club_players`.
- New or extended persistence for player goal acknowledgement/comment data.
- `generate-player-development-focus` Edge Function.

Risks and decisions:
- Need to keep coach-private notes clearly separate from player-visible goals.
- AI-generated content needs clear apply/confirm behavior, not automatic persistence.
- Player comments may require a small schema addition or a scoped extension to existing development records.

Current next step:
- Audit the current player development admin route and player app surfaces against the coach/private and player-visible split.

### ST-003 Training Session Setup and Management

Priority: `P1`
Status: `In progress`

Problem:
Training needs to cover regular club operations: scheduling sessions, assigning field/location, planning drills, and tracking attendance. The app already has pieces of this, but the setup and release behavior need to be reliable.

Outcome:
Admins and coaches can create and manage training sessions, plan the run sheet, maintain policy-driven field/location patterns, and track attendance without data drift. Players can submit simple attendance responses for future visible sessions.

Primary users:
- Club admin
- Coach
- Player

Scope:
- Create/edit sessions with title, date, time, squad, location, goal, focus, and run plan.
- Drill management with name, length, reference link, and the skills the drill is designed to improve.
- A dedicated training library screen where admins can discover drill sources from URLs, review duplicate drills, and add selected drills into the library.
- Attendance marking by admin/coach.
- Simple player-facing attendance response for future sessions the player can see.
- Policy-driven recurring defaults for regular training days, times, and field rotation.
- Training setup workflow to generate or update sessions from policy defaults.
- Past-session review behavior.
- Empty and error states for missing players, missing squad, and invalid dates.

Out of scope for first release:
- Calendar sync for training sessions unless already available from existing code.
- Push notifications.
- Complex recurring-session editor with arbitrary exceptions.
- Player editing of session plans or drills.

Acceptance criteria:
- Training sessions persist to Supabase and refresh across devices.
- Admins/coaches can create, update, and delete future sessions.
- Attendance records remain attached to the correct session and player.
- Players can submit a simple attendance response for future visible sessions.
- Location updates are visible on home, player, training list, and training detail screens.
- Repeated-session field rotation rules can be managed through policy defaults without direct SQL.
- Admins can paste a public drill-library URL, review AI-discovered drills, see duplicates before adding, and add selected non-duplicate drills to the library.
- Past sessions are reviewable and do not encourage accidental edits.

Validation plan:
- Manual create/edit/delete session test.
- Manual admin/coach attendance marking test.
- Manual player attendance response test.
- Cross-device refresh test.
- Role-gating test for admin, coach, and player.

Dependencies:
- `club_training_sessions`.
- `club_attendance_records`.
- Policy settings from `ST-005` for repeated schedule and field defaults.
- Supabase Edge Function and `OPENAI_API_KEY` for drill discovery from URLs.

Risks and decisions:
- Recurring defaults should live in policy settings, with training setup consuming those defaults.
- Drill discovery should be treated as coach-reviewed import, not automatic source-of-truth data.
- Drill links need basic validation if they are user-entered or imported.
- Standard drills should stay short, with longer blocks reserved for small-sided games and match simulation.
- Attendance response rules should be consistent with visibility and lock policies.

Current next step:
- Run manual browser checks for generated sessions, player attendance responses, past-session review, and cross-device refresh.

Implementation notes:
- Tidied the training setup, list, and detail screens around session focus, run-plan duration, and drill link coverage.
- Added save validation so every planned drill needs a reference link.
- Added leadership-ready link coverage indicators for training sessions and drills.
- Removed auto-suggested drills and cleared existing session run plans so drills can be replanned comprehensively.
- Split the admin training list from the add/edit session form so the list screen stays focused.
- Added policy-backed recurring training defaults for title, time, training days, location rotation, and generation window.
- Added admin session generation from policy defaults, with existing training dates preserved instead of duplicated.
- Added player-facing attendance responses for future visible training sessions.
- Made past training sessions review-oriented, with historical attendance rendered read-only and admin list actions avoiding accidental edits/deletes.
- Added focus-driven session plan generation that appends draft drills to the training session run plan for coach review.
- Added a short training session goal field and switched training lists to show the goal instead of the longer session focus.
- Added an automatic 20-minute warm-up block to the start of every training session run plan.
- Simplified the drill data model to name, length, link, and skill tags, with standard drills capped at 12 minutes unless they are small-sided games or match simulation.
- Added drill-library sources so generated session plans can use configured drills that match the session outcomes.
- Moved drill-library management into its own admin training subsection.
- Added URL-based drill discovery through a Supabase Edge Function using OpenAI structured outputs, with duplicate detection and selected-drill import.
- Added skill tags to discovered library drills and generated session drills so coaches can see what each drill is designed to improve.

### ST-004 Games Played by Grade

Priority: `P1`
Status: `Ready`

Problem:
Coaches and admins need trusted visibility of how many games each player has played in each grade to support selection, rotation, finals eligibility, and lower-grade lockout decisions.

Outcome:
The app shows per-player games played totals by grade, based on selected lineup assignments for past fixtures, and uses those counts to warn admins/coaches about eligibility during match selection.

Primary users:
- Club admin
- Coach

Scope:
- Aggregate games played by player, grade, and season.
- Count only past fixtures where the player was selected in the lineup.
- Display grade totals in team management.
- Display eligibility warnings or blocks in match selection when policy thresholds are reached or exceeded.
- Handle same-day fixtures and players selected across multiple grades.
- Explain count source in the UI or supporting text.

Out of scope for first release:
- Historical imports from external league systems.
- Player-level stat history beyond game count.
- Manual played flag separate from selected lineup.

Acceptance criteria:
- Completed/past fixtures count; future fixtures do not.
- Counts are grouped by normalised grade labels.
- Players count only when selected in the lineup for a past fixture.
- Same-day duplicate selection rules are explicit and tested.
- Team management shows player game totals by grade.
- Match selection blocks lower-grade selection when a player has exceeded the higher-grade cap.
- A manually checked fixture sample matches the app totals.

Validation plan:
- Unit tests for aggregation helper.
- Unit tests for policy block helper.
- Manual sample check against known fixtures.
- UI review in team management and match selection on mobile and desktop.

Dependencies:
- Fixture grade consistency.
- Match lineup assignment data.
- Policy thresholds from `ST-005`.

Risks and decisions:
- If historical lineup data is incomplete, counts may under-report.
- Grade naming needs normalization before this becomes trusted.
- Players who exceed the higher-grade cap are blocked from lower-grade selection; other policy feedback remains advisory unless explicitly promoted to a block.

Current next step:
- No immediate follow-up. Re-check against real season fixture data once production lineups are complete.

Implementation notes:
- Added a shared games-played aggregation helper that counts selected lineup assignments from past fixtures only.
- Grade labels are normalised for grouping, with squad-based fallback labels from policy settings when a fixture has no grade label.
- Duplicate lineup records for the same player and fixture count once; same-day selections in different fixtures count as separate games.
- Team management now shows read-only games played by grade for each player.
- Match selection now hard-blocks lower-grade selection once a player has exceeded the higher-grade cap.
- Added an admin games-played report under Matches showing each player down the rows and each team/grade across the columns.
- Fixed demo lineup data so selected players are attached to the real sample fixture IDs.
- Games-played grade labels now use configured Cup/Plate squad labels when fixtures are assigned to a squad, keeping reports and policy blocks aligned.
- Validated the sample report and team list: seven selected players show Cup 1 and team totals show Cup 7, Plate 0, Total 7.
- Validated the lower-grade hard block with a known 9-Cup-game player: Plate selection is blocked, the selected option is disabled, and saved lineup assignment is removed.

### ST-005 League and Club Policy Settings

Priority: `P0`
Status: `Ready`

Problem:
Selection and eligibility rules are currently hardcoded or implicit. Clubs need an admin-managed settings area where league and club policies can be configured without code changes.

Outcome:
Admins can manage selection and eligibility policy settings that affect availability, voting, finals qualification, grade eligibility, and match selection warnings.

Primary users:
- Club admin

Scope:
- Minimum games required to qualify for finals.
- Maximum higher-division games allowed before a player becomes ineligible for a lower division.
- Availability lock window policy.
- Vote eligibility and vote timing policy.
- Grade labels and grade hierarchy used by eligibility rules.
- Player-facing selection criteria for home-and-away games and finals.
- Admin-only editing for policy values.
- Warning or block policy enforcement in selection flows, depending on the specific rule.
- Safe defaults for existing clubs.

Suggested later operations:
- Training defaults such as regular days, times, and field rotation.
- Fine categories/defaults if fines later need policy support.
- Club display settings such as name and logo if they outgrow existing club admin controls.

Out of scope for first release:
- Per-player custom policies.
- Complex league integration.
- Full audit/history for policy changes.
- Coach or player editing of policies.

Acceptance criteria:
- Admins can view current policy values.
- Admins can update policy values and see them reflected in relevant screens.
- Existing clubs get safe defaults with no migration breakage.
- Policy changes persist to Supabase.
- Player and coach screens respect the configured availability and visibility policies.
- Players can read the published home-and-away and finals selection criteria before responding to fixtures.
- Match selection blocks lower-grade selection once the higher-grade cap is exceeded.

Validation plan:
- Schema/data migration verification on linked Supabase.
- Manual policy update and refresh test.
- Role-gating test: only admins can edit policies.
- Regression test for availability lock and player visibility behavior.
- Manual match-selection block test for higher-division cap rules.

Dependencies:
- May require new Supabase table or additional club settings columns.
- Existing settings/admin route.
- Games played by grade from `ST-004`.
- Relevant feature consumers in availability, voting, and match selection.

Risks and decisions:
- Need to keep the first settings model small enough to ship.
- Eligibility policy depends on trusted grade labels and game counts.
- Policy changes touch shared behavior and need careful regression checks.

Current next step:
- No immediate follow-up. Re-check policy persistence and enforcement before the next release candidate.

Implementation notes:
- Added `club_policy_settings` as the minimal policy data model with safe defaults for existing clubs.
- Added admin settings controls for grade labels, finals minimum games, higher-grade cap, availability lock days, player vote delay, and lineup-required player voting.
- Added admin-editable home-and-away and finals selection criteria with player-facing visibility on the availability flow.
- Availability locking and player vote timing/eligibility now read from saved policy settings.
- Lower-grade selection blocks now use `ST-004` games-played by grade and saved policy thresholds.
- Verified the linked Supabase schema includes `club_policy_settings` with the expected policy columns and safe defaults.
- Verified linked Supabase RLS allows club members to read policy settings but restricts insert/update/delete to `private.is_club_admin(club_id)`.
- Verified local policy editing saves and persists after reload for grade labels, finals minimum, higher-grade cap, availability lock days, player vote delay, and lineup-required voting.
- Verified player availability uses the saved lock window: a future fixture inside the configured 10-day lock disables availability buttons and shows the lock reason.
- Verified player vote policy helpers: vote delay controls open/closed state, lineup-required voting limits candidates to lineup teammates and excludes the voter, and open squad voting limits candidates to active same-squad players.
- Validated authenticated cloud admin policy save/refresh persistence against Supabase.

### ST-006 Player Fines Management

Priority: `P2`
Status: `Defined`

Problem:
Fines are a player-managed team culture feature. The app needs to make it easy for players to issue fines to teammates, track what is outstanding, and settle payment status without giving admins/coaches management control.

Outcome:
Players can create fines for visible active teammates, and either the issuer or the fined player can mark a fine paid or unpaid. Admins and coaches can view read-only summaries/lists for context but cannot manage fines.

Primary users:
- Player
- Club admin for read-only visibility
- Coach for read-only visibility

Scope:
- Player fine creation for any visible active teammate.
- Player-facing fine list with status and totals.
- Issuer or fined player can mark a fine paid/unpaid.
- Admin/coach read-only fine summary and list.
- Player filtering/search by teammate and payment status.
- Clear labels that paid/unpaid is a social tracking status, not payment processing.

Out of scope for first release:
- Admin/coach creation, editing, deletion, or payment management.
- Payment processing.
- Automated payment reminders.
- Accounting export.
- Bulk fine entry.

Acceptance criteria:
- Fines persist to Supabase and refresh across devices.
- Players can only issue fines to visible active teammates.
- Players can see fines they issued and fines issued against them.
- Only the issuer or fined player can mark a fine paid/unpaid.
- Admins/coaches can view fines but cannot mutate them.
- Totals match individual rows.
- Paid/unpaid state is clear in player and read-only admin/coach views.
- Empty and error states are usable.

Validation plan:
- Manual player create fine flow.
- Manual paid/unpaid toggle as issuer and fined player.
- Permission check that unrelated players cannot mutate another fine.
- Admin/coach read-only visibility check.
- Totals check with multiple fines.

Dependencies:
- `club_fines`.
- Player visibility and squad policy from `ST-005` if fine targeting is squad-scoped later.

Risks and decisions:
- Current admin/player fine screens may need role behavior changes because fines are player-managed.
- Current data model may need issuer metadata if it does not already capture who created the fine.
- Payment tracking without actual payment integration must be clearly labelled.

Current next step:
- Review the current fines schema and routes, then add issuer tracking if needed before tightening player/admin mutation rules.

### ST-007 Match Stats Reporting

Priority: `P1`
Status: `In progress`

Problem:
Live stat capture is useful during matches, but coaches also need a post-match dashboard that tells the game story, highlights momentum, and exposes the key differences that shaped the result.

Outcome:
The match stats area produces an in-app, team-level coach dashboard focused on score flow, quarter momentum, key differentials, pressure, and territory.

Primary users:
- Coach
- Club admin

Scope:
- Quarter-by-quarter and game-total summaries.
- Team comparison reporting for key metrics.
- Score flow and simple momentum indicators.
- Key stat differentials across pressure, territory, possession, and scoring groups.
- Report view for completed and in-progress matches.
- Simple visual cards/tables without adding a charting dependency.
- Handling of incomplete quarters and legacy game-only stats.

Out of scope for first release:
- Share/export image or PDF output.
- Player-level stat entry or reporting.
- Advanced charting dependency.
- Opposition database.
- Season-average benchmarking.

Acceptance criteria:
- Dashboard totals match captured live stat entries.
- Quarter totals and game totals are internally consistent.
- Dashboard highlights game story, score flow, key differentials, pressure, and territory.
- Reports handle missing quarters without breaking layout.
- Legacy game-only stats still display sensibly.
- Dashboard is readable on mobile and desktop.
- Coaches can navigate from match details to the report without confusion.

Validation plan:
- Unit tests for stat aggregation helpers.
- Manual stat entry and dashboard verification.
- Mobile and desktop visual check.
- Legacy game-only stat display check.

Dependencies:
- `club_match_stats`.
- Existing match stats route.
- Existing team-level stat metric set.

Risks and decisions:
- Need to avoid overbuilding charts before validating what coaches actually use.
- Legacy stats compatibility may constrain dashboard logic.
- Player-level stats should be tracked as a separate future item if requested.

Current next step:
- Identify the current reporting surface in `match-stats-route` and split the dashboard summary into reusable aggregation/display pieces.

### ST-008 Bundle Splitting

Priority: `P3`
Status: `Ready`

Problem:
The Vite build has previously warned about large chunks. This is not a product blocker, but it can affect load performance as the app grows.

Outcome:
The app build has smaller route-level chunks without making routing or local development harder to understand, if current build output proves this is needed.

Scope:
- Inspect current build output before changing code.
- Consider route-level lazy loading for large admin/player screens only if there is a real warning or load concern.
- Avoid speculative performance work that complicates the app.

Acceptance criteria:
- Build still passes.
- Initial chunk size warning is reduced or explicitly justified as acceptable.
- Routes still load with useful skeletons/loading behavior.

Current next step:
- No immediate follow-up. Re-run the production build after major route or dependency changes.

Implementation notes:
- Split route screens behind React lazy imports so the initial app shell no longer imports every admin/player screen up front.
- Added explicit Vite vendor chunks for React, Supabase, and remaining third-party modules so shared dependencies cache separately from app code.
- Changed cloud data hydration to render a cached local club snapshot immediately when available, then refresh cloud data in the background.
- Production build no longer emits the Vite large chunk warning; the app shell chunk is about 115 kB minified, down from about 744 kB before route splitting.

### ST-009 Visual QA Sweep

Priority: `P1`
Status: `Ready`

Problem:
The app has grown across many admin/player screens. A visual QA pass can catch layout, mobile, and empty-state issues before a release.

Outcome:
Key screens are checked across desktop and mobile. Quick issues are fixed immediately; larger issues are added back into this backlog with stable IDs.

Scope:
- Admin home, team, team setup, training, matches, player development, fines, votes, fitness, settings.
- Player home, availability, matches, training, fines, votes.
- Auth and club access screens.
- Mobile drawer and sidebar preferences.
- Empty, loading, error, and permission states where practical.

Acceptance criteria:
- Screens fit without overlapping text or controls.
- Empty/loading/error states are understandable.
- Mobile drawer and main navigation are usable.
- Quick issues found during QA are fixed.
- Larger issues are logged as new backlog items with IDs, priorities, and current next steps.

Current next step:
- No immediate follow-up. Re-run a visual QA sweep before the next release candidate or after major UI changes.

Implementation notes:
- Started ST-009 with the recently changed admin team, match selection, settings, games-played report, and public matches routes.
- Confirmed those routes respond from the local dev server.
- Fixed the first quick UI issue found in the table pattern: empty team-list messages now keep table padding.
- Added a local admin-club fallback so protected screens can be visually QA'd without Supabase authentication during local development.
- Checked admin home, team, games-played report, policy settings, training, training settings, training library, matches, match detail, training detail, player home, and player availability at desktop and mobile sizes.
- Fixed mobile team-list labels so the responsive player table consistently shows the Player, Role, Games, Status, and Actions labels.
- Fixed the games-played report on mobile so Cup, Plate, and Total counts remain visible without horizontal scrolling.
- Completed the remaining ST-009 pass across team setup, rotation groups, development, fines, votes, fitness, club access, training add/edit, public training/matches lists, match stats, match votes, team announcement, player fines, auth, empty states, and mobile drawer behavior.
- Fixed edit-training-session IA so the screen is grouped under Training instead of Club.
- Confirmed the checked screens have no horizontal overflow and no browser console errors at desktop and mobile sizes.

## New Intake

Add untriaged requests here before assigning IDs and priorities.

- None.
