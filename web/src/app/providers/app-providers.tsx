import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@web/lib/auth-context';
import { ClubAccessProvider } from '@web/lib/club-access-context';
import { ClubDataProvider } from '@web/lib/club-data-context';
import { SettingsProvider } from '@web/lib/settings-context';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ClubAccessProvider>
          <ClubDataProvider>{children}</ClubDataProvider>
        </ClubAccessProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
