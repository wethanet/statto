export async function readJsonStorage<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as T;
}

export async function writeJsonStorage<T>(key: string, value: T): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}
