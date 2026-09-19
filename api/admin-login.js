import { buildSessionCookie, createSessionToken, verifyCredentials } from './lib/auth.js';
import { readJson, sendJson } from './lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readJson(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!verifyCredentials(username, password)) {
      sendJson(res, 401, { error: 'Invalid username or password.' });
      return;
    }

    res.setHeader('Set-Cookie', buildSessionCookie(createSessionToken()));
    sendJson(res, 200, { ok: true });
  } catch {
    sendJson(res, 400, { error: 'Could not sign in. Try again.' });
  }
}
