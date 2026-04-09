import { AppProviders } from '@web/app/providers/app-providers';
import { AppRouter } from '@web/app/router';

export function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
