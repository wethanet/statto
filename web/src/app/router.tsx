import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { PageSkeleton } from '@web/components/loading/page-skeleton';
import { AdminHomeRoute } from '@web/routes/admin/admin-home-route';
import { ClubAdminRoute } from '@web/routes/admin/club-admin-route';
import { FinesAdminRoute } from '@web/routes/admin/fines-admin-route';
import { FitnessAdminRoute } from '@web/routes/admin/fitness-admin-route';
import { GamesPlayedReportRoute } from '@web/routes/admin/games-played-report-route';
import { PlayerDevelopmentAdminRoute } from '@web/routes/admin/player-development-admin-route';
import { AuthScreen } from '@web/routes/auth-screen';
import { ClubAccessScreen } from '@web/routes/club-access-screen';
import { HomeScreen } from '@web/routes/home-screen';
import { PasswordResetScreen } from '@web/routes/password-reset-screen';
import { MatchesAdminRoute } from '@web/routes/admin/matches-admin-route';
import { RotationGroupsAdminRoute } from '@web/routes/admin/rotation-groups-admin-route';
import { SettingsAdminRoute } from '@web/routes/admin/settings-admin-route';
import { TeamAdminRoute } from '@web/routes/admin/team-admin-route';
import { TeamSetupAdminRoute } from '@web/routes/admin/team-setup-admin-route';
import { VotesAdminRoute } from '@web/routes/admin/votes-admin-route';
import { PlayerAvailabilityRoute } from '@web/routes/player/player-availability-route';
import { PlayerFinesRoute } from '@web/routes/player/player-fines-route';
import { PlayerHomeRoute } from '@web/routes/player/player-home-route';
import { PlayerVotesRoute } from '@web/routes/player/player-votes-route';
import { MatchDetailRoute } from '@web/routes/matches/match-detail-route';
import { MatchesListRoute } from '@web/routes/matches/matches-list-route';
import { MatchStatsRoute } from '@web/routes/matches/match-stats-route';
import { TeamSelectionGraphicRoute } from '@web/routes/matches/team-selection-graphic-route';
import { MatchVotesRoute } from '@web/routes/matches/match-votes-route';
import {
  TrainingAdminRoute,
  TrainingLibraryRoute,
  TrainingSessionFormRoute,
  TrainingSettingsRoute,
} from '@web/routes/admin/training-admin-route';
import { TrainingDetailRoute } from '@web/routes/training/training-detail-route';
import { TrainingListRoute } from '@web/routes/training/training-list-route';
import { ShellLayout } from '@web/app/shell-layout';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';
import { useClubPermissions } from '@web/lib/club-permissions';

function LoadingGate() {
  return (
    <main className="gate-shell">
      <section className="stack">
        <section className="panel panel--centered stack skeleton-card">
          <span className="eyebrow">Statto Web</span>
          <h1>Loading your club data...</h1>
          <p className="muted">Preparing your club workspace and syncing the latest data.</p>
        </section>

        <PageSkeleton pathname="/" />
      </section>
    </main>
  );
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
    </BrowserRouter>
  );
}
