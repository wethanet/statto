import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@web/lib/auth-context';
import { ClubAccessProvider } from '@web/lib/club-access-context';
import { ClubDataProvider } from '@web/lib/club-data-context';
import { PlayerProfileProvider } from '@web/lib/player-profile-context';
import { SettingsProvider } from '@web/lib/settings-context';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ClubAccessProvider>
          <ClubDataProvider>
            <PlayerProfileProvider>{children}</PlayerProfileProvider>
          </ClubDataProvider>
        </ClubAccessProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
