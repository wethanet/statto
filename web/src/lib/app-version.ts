import packageJson from '../../package.json';

function getMajorMinorVersion(version: string) {
  const [major = '0', minor = '0'] = version.split('.');

  return `${major}.${minor}`;
}

export const APP_VERSION = getMajorMinorVersion(packageJson.version);
