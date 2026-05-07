import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@web/lib/auth-context';
import { ClubAccessProvider } from '@web/lib/club-access-context';
import { ClubDataProvider } from '@web/lib/club-data-context';
import { ClubPolicyProvider } from '@web/lib/club-policy-context';
import { PlayerProfileProvider } from '@web/lib/player-profile-context';
import { SettingsProvider } from '@web/lib/settings-context';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ClubAccessProvider>
          <ClubDataProvider>
            <ClubPolicyProvider>
              <PlayerProfileProvider>{children}</PlayerProfileProvider>
            </ClubPolicyProvider>
          </ClubDataProvider>
        </ClubAccessProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
