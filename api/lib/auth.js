import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { parseCookies } from './http.js';

export const SESSION_COOKIE = 'rw_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const getUsername = () => process.env.ADMIN_USERNAME || 'admin';
const getPassword = () => process.env.ADMIN_PASSWORD || 'saNtaf-gyxcaq-7vepze';
const getSecret = () => process.env.ADMIN_SESSION_SECRET || 'river-watch-admin-session';

function sign(value) {
  return createHmac('sha256', getSecret()).update(value).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyCredentials(username, password) {
  return safeEqual(username, getUsername()) && safeEqual(password, getPassword());
}

export function createSessionToken() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = randomBytes(16).toString('hex');
  const payload = `${expiresAt}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function readSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [expiresAt, nonce, signature] = parts;
  const payload = `${expiresAt}.${nonce}`;
  if (!safeEqual(signature, sign(payload))) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return { expiresAt: Number(expiresAt) };
}

export function isAuthenticated(req) {
  return readSession(req) !== null;
}

export function buildSessionCookie(token, { clear = false } = {}) {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  const parts = [
    `${SESSION_COOKIE}=${clear ? '' : encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (clear) {
    parts.push('Max-Age=0');
  } else {
    parts.push(`Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
  }

  if (secure) parts.push('Secure');
  return parts.join('; ');
}
