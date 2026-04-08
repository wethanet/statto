import { Platform } from 'react-native';

async function getNativeStorageFile(fileName: string) {
  const { Directory, File, Paths } = await import('expo-file-system');
  const appStorageDirectory = new Directory(Paths.document, 'statto');

  return {
    appStorageDirectory,
    file: new File(appStorageDirectory, fileName),
  };
}

export async function readJsonStorage<T>(key: string): Promise<T | null> {
  if (Platform.OS === 'web') {
    const rawValue = globalThis.localStorage?.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  }

  const { file } = await getNativeStorageFile(key);

  if (!file.exists) {
    return null;
  }

  const rawValue = await file.text();

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as T;
}

export async function writeJsonStorage<T>(key: string, value: T): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return;
  }

  const { appStorageDirectory, file } = await getNativeStorageFile(key);

  appStorageDirectory.create({ idempotent: true, intermediates: true });

  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }

  file.write(JSON.stringify(value));
}
