import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AdminHomeRoute } from '@web/routes/admin/admin-home-route';
import { ClubAdminRoute } from '@web/routes/admin/club-admin-route';
import { FinesAdminRoute } from '@web/routes/admin/fines-admin-route';
import { FitnessAdminRoute } from '@web/routes/admin/fitness-admin-route';
import { AuthScreen } from '@web/routes/auth-screen';
import { ClubAccessScreen } from '@web/routes/club-access-screen';
import { HomeScreen } from '@web/routes/home-screen';
import { MatchesAdminRoute } from '@web/routes/admin/matches-admin-route';
import { RotationGroupsAdminRoute } from '@web/routes/admin/rotation-groups-admin-route';
import { SettingsAdminRoute } from '@web/routes/admin/settings-admin-route';
import { TeamAdminRoute } from '@web/routes/admin/team-admin-route';
import { TeamSetupAdminRoute } from '@web/routes/admin/team-setup-admin-route';
import { VotesAdminRoute } from '@web/routes/admin/votes-admin-route';
import { MatchDetailRoute } from '@web/routes/matches/match-detail-route';
import { MatchesListRoute } from '@web/routes/matches/matches-list-route';
import { MatchStatsRoute } from '@web/routes/matches/match-stats-route';
import { TeamSelectionGraphicRoute } from '@web/routes/matches/team-selection-graphic-route';
import { MatchVotesRoute } from '@web/routes/matches/match-votes-route';
import { TrainingAdminRoute } from '@web/routes/admin/training-admin-route';
import { TrainingDetailRoute } from '@web/routes/training/training-detail-route';
import { TrainingListRoute } from '@web/routes/training/training-list-route';
import { ShellLayout } from '@web/app/shell-layout';
import { useAuth } from '@web/lib/auth-context';
import { useClubAccess } from '@web/lib/club-access-context';

function LoadingGate() {
  return (
    <main className="gate-shell">
      <section className="panel panel--centered">
        <span className="eyebrow">Statto Web</span>
        <h1>Loading your club data...</h1>
        <p className="muted">Preparing your club workspace and syncing the latest data.</p>
      </section>
    </main>
  );
}

export function AppRouter() {
  const { isConfigured, isLoading, session } = useAuth();
  const { activeClub, isLoading: isClubAccessLoading } = useClubAccess();
  const requiresAuth = isConfigured;
  const hasSession = !requiresAuth || Boolean(session);
  const hasClubAccess = !requiresAuth || Boolean(activeClub);

  if (isLoading || (hasSession && isClubAccessLoading)) {
    return <LoadingGate />;
  }

  if (!hasSession) {
    return <AuthScreen />;
  }

  if (!hasClubAccess) {
    return <ClubAccessScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={<HomeScreen />} />
          <Route path="/training" element={<TrainingListRoute />} />
          <Route path="/training/:sessionId" element={<TrainingDetailRoute />} />
          <Route path="/matches" element={<MatchesListRoute />} />
          <Route path="/matches/:fixtureId" element={<MatchDetailRoute />} />
          <Route path="/matches/:fixtureId/announcement" element={<TeamSelectionGraphicRoute />} />
          <Route path="/matches/:fixtureId/stats" element={<MatchStatsRoute />} />
          <Route path="/matches/:fixtureId/votes" element={<MatchVotesRoute />} />
          <Route path="/admin" element={<AdminHomeRoute />} />
          <Route path="/admin/team" element={<TeamAdminRoute />} />
          <Route path="/admin/team-setup" element={<TeamSetupAdminRoute />} />
          <Route path="/admin/rotation-groups" element={<RotationGroupsAdminRoute />} />
          <Route path="/admin/training" element={<TrainingAdminRoute />} />
          <Route path="/admin/matches" element={<MatchesAdminRoute />} />
          <Route path="/admin/fines" element={<FinesAdminRoute />} />
          <Route path="/admin/votes" element={<VotesAdminRoute />} />
          <Route path="/admin/fitness" element={<FitnessAdminRoute />} />
          <Route path="/admin/settings" element={<SettingsAdminRoute />} />
          <Route path="/admin/club" element={<ClubAdminRoute />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
