export const APP_BUILD_ID = __APP_BUILD_ID__;

const DISMISS_KEY = 'riverwatch-dismissed-app-update';
const CHECK_INTERVAL_MS = 60_000;
const MIN_GAP_MS = 10_000;

export type AppUpdate = { id: string };

type Listener = (update: AppUpdate | null) => void;

let versionMismatch: string | null = null;
let serviceWorkerWaiting = false;
let current: AppUpdate | null = null;
let lastCheck = 0;
let started = false;
let intervalId = 0;

const listeners = new Set<Listener>();

function storageGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore private-mode storage failures.
  }
}

function storageRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore private-mode storage failures.
  }
}

export function dismissedUpdateId() {
  return storageGet(DISMISS_KEY);
}

export function dismissAppUpdate(id: string) {
  storageSet(DISMISS_KEY, id);
}

export function clearDismissedUpdate() {
  storageRemove(DISMISS_KEY);
}

function computeUpdate(): AppUpdate | null {
  // One deploy shares one id, so a service worker that finishes installing
  // after the version check does not prompt a second time.
  if (versionMismatch) return { id: versionMismatch };
  if (serviceWorkerWaiting) return { id: `service-worker:${APP_BUILD_ID}` };
  return null;
}

function publish() {
  const next = computeUpdate();
  if (current?.id === next?.id) return;
  current = next;
  listeners.forEach((listener) => listener(current));
}

export function subscribeToAppUpdate(listener: Listener) {
  listener(current);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function checkRemoteVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return;

    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('buildId' in data)) return;

    const buildId = (data as { buildId: unknown }).buildId;
    if (typeof buildId !== 'string' || buildId.length === 0) return;

    versionMismatch = buildId === APP_BUILD_ID ? null : buildId;
    publish();
  } catch {
    // Keep the running version when the check cannot reach the server.
  }
}

function markServiceWorkerWaiting(registration: ServiceWorkerRegistration) {
  serviceWorkerWaiting = Boolean(registration.waiting && navigator.serviceWorker.controller);
  publish();
}

function watchRegistration(registration: ServiceWorkerRegistration) {
  markServiceWorkerWaiting(registration);

  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        serviceWorkerWaiting = true;
        publish();
      }
    });
  });
}

async function refreshServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    markServiceWorkerWaiting(registration);
    await registration.update();
    markServiceWorkerWaiting(registration);
  } catch {
    // A failed update check should not interrupt the open dashboard.
  }
}

function runCheck(force = false) {
  const now = Date.now();
  if (!force && now - lastCheck < MIN_GAP_MS) return;
  lastCheck = now;
  void checkRemoteVersion();
  void refreshServiceWorker();
}

export function checkForAppUpdate() {
  runCheck(true);
}

function reloadForUpdate() {
  window.location.reload();
}

export async function applyAppUpdate() {
  clearDismissedUpdate();

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            window.clearTimeout(timer);
            navigator.serviceWorker.removeEventListener('controllerchange', finish);
            resolve();
          };
          const timer = window.setTimeout(finish, 1000);
          navigator.serviceWorker.addEventListener('controllerchange', finish);
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
        });
      }
    }
  } catch {
    // Reload even if the waiting service worker cannot be activated.
  }

  reloadForUpdate();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') runCheck();
}

function onFocus() {
  runCheck();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const canRegister =
    import.meta.env.PROD ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!canRegister) return;

  navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      watchRegistration(registration);
      void registration.update().catch(() => undefined);
    })
    .catch((error: unknown) => {
      console.warn('Service worker registration failed:', error);
    });
}

export function startAppUpdateWatcher() {
  if (started || typeof window === 'undefined') return;
  started = true;

  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker, { once: true });

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onFocus);
  intervalId = window.setInterval(() => runCheck(), CHECK_INTERVAL_MS);
  runCheck(true);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      started = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
    });
  }
}
