import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SETTINGS_PATHNAME = 'river-watch-site-settings.json';
const LOCAL_PATH = path.join(process.cwd(), 'data', 'site-settings.json');
const TMP_PATH = path.join('/tmp', SETTINGS_PATHNAME);

const THEMES = ['default', 'spring', 'summer', 'fall', 'winter', 'holiday'];

export const DEFAULT_SETTINGS = {
  theme: 'default',
  banner: '',
  subtitle: '',
  announcements: [],
};

const memory = globalThis;
if (!memory.__riverWatchSettings) {
  memory.__riverWatchSettings = null;
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeAnnouncement(item) {
  if (!item || typeof item !== 'object') return null;
  const title = asString(item.title).trim();
  if (!title) return null;

  return {
    id: asString(item.id).trim() || `ann-${Date.now()}`,
    title: title.slice(0, 120),
    date: asString(item.date).trim().slice(0, 80),
    href: asString(item.href).trim().slice(0, 500),
    cta: asString(item.cta).trim().slice(0, 40) || 'Details',
    kicker: asString(item.kicker).trim().slice(0, 40) || 'Announcement',
    logo: asString(item.logo).trim().slice(0, 500),
    logoAlt: asString(item.logoAlt).trim().slice(0, 120),
    published: item.published !== false,
  };
}

export function sanitizeSettings(input) {
  const source = input && typeof input === 'object' ? input : {};
  const theme = THEMES.includes(source.theme) ? source.theme : 'default';
  const announcements = Array.isArray(source.announcements)
    ? source.announcements.map(sanitizeAnnouncement).filter(Boolean).slice(0, 20)
    : [];

  return {
    theme,
    banner: asString(source.banner).trim().slice(0, 240),
    subtitle: asString(source.subtitle).trim().slice(0, 80),
    announcements,
  };
}

async function readJsonFile(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath, settings) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

async function readFromBlob() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: SETTINGS_PATHNAME, limit: 1, token });
    const blob = blobs[0];
    if (!blob?.url) return null;
    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return null;
    return sanitizeSettings(await response.json());
  } catch {
    return null;
  }
}

async function writeToBlob(settings) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;

  try {
    const { put } = await import('@vercel/blob');
    await put(SETTINGS_PATHNAME, JSON.stringify(settings), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
      contentType: 'application/json',
    });
    return true;
  } catch {
    return false;
  }
}

export async function readSettings() {
  const fromBlob = await readFromBlob();
  if (fromBlob) {
    memory.__riverWatchSettings = fromBlob;
    return fromBlob;
  }

  const fromTmp = await readJsonFile(TMP_PATH);
  if (fromTmp) {
    memory.__riverWatchSettings = fromTmp;
    return fromTmp;
  }

  const fromLocal = await readJsonFile(LOCAL_PATH);
  if (fromLocal) {
    memory.__riverWatchSettings = fromLocal;
    return fromLocal;
  }

  if (memory.__riverWatchSettings) return memory.__riverWatchSettings;
  return { ...DEFAULT_SETTINGS, announcements: [] };
}

export async function writeSettings(input) {
  const settings = sanitizeSettings(input);
  memory.__riverWatchSettings = settings;

  const persistedToBlob = await writeToBlob(settings);
  if (!persistedToBlob) {
    try {
      await writeJsonFile(LOCAL_PATH, settings);
    } catch {
      // Production filesystems are read-only; /tmp still helps a warm instance.
    }
    try {
      await writeJsonFile(TMP_PATH, settings);
    } catch {
      // Ignore tmp write failures; memory cache still serves this instance.
    }
  }

  return settings;
}

export function persistenceHint() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.VERCEL === '1') return 'ephemeral';
  return 'file';
}
