const APP_VERSION_RELOAD_KEY = 'statto:app-version:reload-attempted';

function getCurrentEntrypoints() {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((script) => {
      return new URL(script.src, window.location.href).pathname;
    })
    .sort();
}

function getEntrypointsFromHtml(html: string) {
  const documentSnapshot = new DOMParser().parseFromString(html, 'text/html');

  return Array.from(documentSnapshot.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((script) => {
      const src = script.getAttribute('src');
      return src ? new URL(src, window.location.origin).pathname : null;
    })
    .filter((src): src is string => Boolean(src))
    .sort();
}

function hasEntrypointChanged(currentEntrypoints: string[], latestEntrypoints: string[]) {
  if (currentEntrypoints.length === 0 || latestEntrypoints.length === 0) {
    return false;
  }

  return currentEntrypoints.join('\n') !== latestEntrypoints.join('\n');
}

export async function checkForAppVersionRefresh() {
  if (import.meta.env.DEV) {
    return;
  }

  try {
    const now = Date.now();
    const response = await fetch(`${window.location.origin}/?appVersionCheck=${now}`, {
      cache: 'reload',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return;
    }

    const latestHtml = await response.text();
    const currentEntrypoints = getCurrentEntrypoints();
    const latestEntrypoints = getEntrypointsFromHtml(latestHtml);

    if (!hasEntrypointChanged(currentEntrypoints, latestEntrypoints)) {
      window.sessionStorage.removeItem(APP_VERSION_RELOAD_KEY);
      return;
    }

    if (window.sessionStorage.getItem(APP_VERSION_RELOAD_KEY) === 'true') {
      return;
    }

    window.sessionStorage.setItem(APP_VERSION_RELOAD_KEY, 'true');
    window.location.reload();
  } catch (error) {
    console.warn('Could not check for the latest app version.', error);
  }
}
