import { parseBarStatusHtml } from './lib/bar-status.js';

const SOURCE_URL = 'https://www.columbiariverbarpilots.com/bar-status/';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'RiverWatch/1.0',
      },
    });

    if (!response.ok) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'Bar status unavailable' }));
      return;
    }

    const status = parseBarStatusHtml(await response.text());
    if (!status) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'Bar status unavailable' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.end(JSON.stringify(status));
  } catch (error) {
    console.error('Bar status fetch failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Bar status unavailable' }));
  }
}
