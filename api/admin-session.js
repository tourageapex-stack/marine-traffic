import { isAuthenticated } from './lib/auth.js';
import { sendJson } from './lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(res, 200, { authenticated: isAuthenticated(req) });
}
