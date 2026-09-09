import { buildSessionCookie } from './lib/auth.js';
import { sendJson } from './lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  res.setHeader('Set-Cookie', buildSessionCookie('', { clear: true }));
  sendJson(res, 200, { ok: true });
}
