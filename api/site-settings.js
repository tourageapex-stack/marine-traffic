import { isAuthenticated } from './lib/auth.js';
import { readJson, sendJson } from './lib/http.js';
import { persistenceHint, readSettings, writeSettings } from './lib/store.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = await readSettings();
    sendJson(res, 200, { ...settings, persistence: persistenceHint() });
    return;
  }

  if (req.method === 'PUT') {
    if (!isAuthenticated(req)) {
      sendJson(res, 401, { error: 'Sign in required.' });
      return;
    }

    try {
      const body = await readJson(req);
      const settings = await writeSettings(body);
      sendJson(res, 200, { ...settings, persistence: persistenceHint() });
    } catch {
      sendJson(res, 400, { error: 'Could not save settings.' });
    }
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}
