import { useSettings } from '@/lib/settings-context';

export function useColorScheme() {
  return useSettings().resolvedColorScheme;
}
