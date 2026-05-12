import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppShellSkeleton } from '@web/components/loading/page-skeleton';
import { AuthScreen } from '@web/routes/auth-screen';
import { ClubAccessScreen } from '@web/routes/club-access-screen';
import { PasswordResetScreen } from '@web/routes/password-reset-screen';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubPermissions } from '@web/lib/club-permissions';

const ShellLayout = lazy(() => import('@web/app/shell-layout').then(({ ShellLayout }) => ({ default: ShellLayout })));
const HomeScreen = lazy(() => import('@web/routes/home-screen').then(({ HomeScreen }) => ({ default: HomeScreen })));
const TrainingListRoute = lazy(() =>
  import('@web/routes/training/training-list-route').then(({ TrainingListRoute }) => ({
    default: TrainingListRoute,
  }))
);
const TrainingDetailRoute = lazy(() =>
  import('@web/routes/training/training-detail-route').then(({ TrainingDetailRoute }) => ({
    default: TrainingDetailRoute,
  }))
);
const MatchesListRoute = lazy(() =>
  import('@web/routes/matches/matches-list-route').then(({ MatchesListRoute }) => ({
    default: MatchesListRoute,
  }))
);
const MatchDetailRoute = lazy(() =>
  import('@web/routes/matches/match-detail-route').then(({ MatchDetailRoute }) => ({
    default: MatchDetailRoute,
  }))
);
const TeamSelectionGraphicRoute = lazy(() =>
  import('@web/routes/matches/team-selection-graphic-route').then(({ TeamSelectionGraphicRoute }) => ({
    default: TeamSelectionGraphicRoute,
  }))
);
const MatchStatsRoute = lazy(() =>
  import('@web/routes/matches/match-stats-route').then(({ MatchStatsRoute }) => ({
    default: MatchStatsRoute,
  }))
);
const MatchVotesRoute = lazy(() =>
  import('@web/routes/matches/match-votes-route').then(({ MatchVotesRoute }) => ({
    default: MatchVotesRoute,
  }))
);
const PlayerHomeRoute = lazy(() =>
  import('@web/routes/player/player-home-route').then(({ PlayerHomeRoute }) => ({
    default: PlayerHomeRoute,
  }))
);
const PlayerAvailabilityRoute = lazy(() =>
  import('@web/routes/player/player-availability-route').then(({ PlayerAvailabilityRoute }) => ({
    default: PlayerAvailabilityRoute,
  }))
);
const PlayerFinesRoute = lazy(() =>
  import('@web/routes/player/player-fines-route').then(({ PlayerFinesRoute }) => ({
    default: PlayerFinesRoute,
  }))
);
const PlayerVotesRoute = lazy(() =>
  import('@web/routes/player/player-votes-route').then(({ PlayerVotesRoute }) => ({
    default: PlayerVotesRoute,
  }))
);
const AdminHomeRoute = lazy(() =>
  import('@web/routes/admin/admin-home-route').then(({ AdminHomeRoute }) => ({
    default: AdminHomeRoute,
  }))
);
const TeamAdminRoute = lazy(() =>
  import('@web/routes/admin/team-admin-route').then(({ TeamAdminRoute }) => ({
    default: TeamAdminRoute,
  }))
);
const TeamSetupAdminRoute = lazy(() =>
  import('@web/routes/admin/team-setup-admin-route').then(({ TeamSetupAdminRoute }) => ({
    default: TeamSetupAdminRoute,
  }))
);
const RotationGroupsAdminRoute = lazy(() =>
  import('@web/routes/admin/rotation-groups-admin-route').then(({ RotationGroupsAdminRoute }) => ({
    default: RotationGroupsAdminRoute,
  }))
);
const PlayerDevelopmentAdminRoute = lazy(() =>
  import('@web/routes/admin/player-development-admin-route').then(({ PlayerDevelopmentAdminRoute }) => ({
    default: PlayerDevelopmentAdminRoute,
  }))
);
const TrainingAdminRoute = lazy(() =>
  import('@web/routes/admin/training-admin-route').then(({ TrainingAdminRoute }) => ({
    default: TrainingAdminRoute,
  }))
);
const TrainingSettingsRoute = lazy(() =>
  import('@web/routes/admin/training-admin-route').then(({ TrainingSettingsRoute }) => ({
    default: TrainingSettingsRoute,
  }))
);
const TrainingLibraryRoute = lazy(() =>
  import('@web/routes/admin/training-admin-route').then(({ TrainingLibraryRoute }) => ({
    default: TrainingLibraryRoute,
  }))
);
const TrainingSessionFormRoute = lazy(() =>
  import('@web/routes/admin/training-admin-route').then(({ TrainingSessionFormRoute }) => ({
    default: TrainingSessionFormRoute,
  }))
);
const MatchesAdminRoute = lazy(() =>
  import('@web/routes/admin/matches-admin-route').then(({ MatchesAdminRoute }) => ({
    default: MatchesAdminRoute,
  }))
);
const GamesPlayedReportRoute = lazy(() =>
  import('@web/routes/admin/games-played-report-route').then(({ GamesPlayedReportRoute }) => ({
    default: GamesPlayedReportRoute,
  }))
);
const FinesAdminRoute = lazy(() =>
  import('@web/routes/admin/fines-admin-route').then(({ FinesAdminRoute }) => ({
    default: FinesAdminRoute,
  }))
);
const VotesAdminRoute = lazy(() =>
  import('@web/routes/admin/votes-admin-route').then(({ VotesAdminRoute }) => ({
    default: VotesAdminRoute,
  }))
);
const FitnessAdminRoute = lazy(() =>
  import('@web/routes/admin/fitness-admin-route').then(({ FitnessAdminRoute }) => ({
    default: FitnessAdminRoute,
  }))
);
const SettingsAdminRoute = lazy(() =>
  import('@web/routes/admin/settings-admin-route').then(({ SettingsAdminRoute }) => ({
    default: SettingsAdminRoute,
  }))
);
const ClubAdminRoute = lazy(() =>
  import('@web/routes/admin/club-admin-route').then(({ ClubAdminRoute }) => ({
    default: ClubAdminRoute,
  }))
);

function LoadingGate() {
  return <AppShellSkeleton />;
}

type AccessGateProps = {
  allow: boolean;
  redirectTo: string;
  children: ReactElement;
};

function AccessGate({ allow, children, redirectTo }: AccessGateProps) {
  if (!allow) {
    return <Navigate replace to={redirectTo} />;
  }

  return children;
}

export function AppRouter() {
  const { isConfigured, isLoading, isPasswordRecovery, session } = useAuth();
  const { activeClub, isLoading: isClubAccessLoading } = useClubAccess();
  const {
    canAccessAdmin,
    canAccessPlayerApp,
    canAccessTrainingSessionPlans,
    canManageClubMemberships,
    canManageRosterSetup,
    isPlayer,
  } = useClubPermissions();
  const requiresAuth = isConfigured;
  const hasSession = !requiresAuth || Boolean(session);
  const hasClubAccess = !requiresAuth || Boolean(activeClub);

  if (isLoading || (hasSession && isClubAccessLoading)) {
    return <LoadingGate />;
  }

  if (!hasSession) {
    return <AuthScreen />;
  }

  if (isPasswordRecovery) {
    return <PasswordResetScreen />;
  }

  if (!hasClubAccess) {
    return <ClubAccessScreen />;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingGate />}>
        <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={canAccessPlayerApp && !canAccessAdmin ? <Navigate replace to="/player" /> : <HomeScreen />} />
          <Route path="/training" element={<TrainingListRoute />} />
          <Route
            path="/training/:sessionId"
            element={
              <AccessGate allow={canAccessTrainingSessionPlans} redirectTo="/training">
                <TrainingDetailRoute />
              </AccessGate>
            }
          />
          <Route path="/matches" element={<MatchesListRoute />} />
          <Route
            path="/matches/:fixtureId"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo="/matches">
                <MatchDetailRoute />
              </AccessGate>
            }
          />
          <Route
            path="/matches/:fixtureId/announcement"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo="/matches">
                <TeamSelectionGraphicRoute />
              </AccessGate>
            }
          />
          <Route
            path="/matches/:fixtureId/stats"
            element={
              <AccessGate allow={canAccessAdmin || canAccessPlayerApp} redirectTo="/matches">
                <MatchStatsRoute />
              </AccessGate>
            }
          />
          <Route
            path="/matches/:fixtureId/votes"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo="/matches">
                <MatchVotesRoute />
              </AccessGate>
            }
          />
          <Route
            path="/player"
            element={
              <AccessGate allow={canAccessPlayerApp} redirectTo="/">
                <PlayerHomeRoute />
              </AccessGate>
            }
          />
          <Route
            path="/player/availability"
            element={
              <AccessGate allow={canAccessPlayerApp} redirectTo="/">
                <PlayerAvailabilityRoute />
              </AccessGate>
            }
          />
          <Route
            path="/player/fines"
            element={
              <AccessGate allow={canAccessPlayerApp} redirectTo="/">
                <PlayerFinesRoute />
              </AccessGate>
            }
          />
          <Route
            path="/player/votes"
            element={
              <AccessGate allow={isPlayer} redirectTo="/player">
                <PlayerVotesRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <AdminHomeRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/team"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TeamAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/team-setup"
            element={
              <AccessGate allow={canManageRosterSetup} redirectTo="/admin/team">
                <TeamSetupAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/rotation-groups"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <RotationGroupsAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/development"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <PlayerDevelopmentAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/training"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TrainingAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/training/settings"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TrainingSettingsRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/training/library"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TrainingLibraryRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/training/new"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TrainingSessionFormRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/training/:sessionId/edit"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <TrainingSessionFormRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/matches"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <MatchesAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/matches/games-played"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <GamesPlayedReportRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/fines"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <FinesAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/votes"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <VotesAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/fitness"
            element={
              <AccessGate allow={canAccessAdmin} redirectTo={canAccessPlayerApp ? '/player' : '/'}>
                <FitnessAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AccessGate allow={canManageRosterSetup} redirectTo="/admin">
                <SettingsAdminRoute />
              </AccessGate>
            }
          />
          <Route
            path="/admin/club"
            element={
              <AccessGate allow={canManageClubMemberships} redirectTo="/admin">
                <ClubAdminRoute />
              </AccessGate>
            }
          />
        </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
