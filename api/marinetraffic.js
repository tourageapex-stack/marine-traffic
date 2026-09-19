const ALLOWED_HOSTS = ['www.marinetraffic.com', 'marinetraffic.com'];

/**
 * @param {string | string[] | undefined | null} rawUrl
 * @returns {string | null}
 */
export function resolveTarget(rawUrl) {
  const value = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  if (!value) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) return null;
  return parsed.toString();
}

/**
 * Bounces a vessel link off our own origin before it reaches marinetraffic.com.
 * MarineTraffic claims every path on its domain for the mobile app, and the app
 * only resolves its internal shipid links, so a tapped IMO link lands on the app
 * home screen with no vessel. Neither iOS nor Android hands off a server
 * redirect, so this keeps the link in the browser where the IMO URL resolves.
 */
export default function handler(req, res) {
  const target = resolveTarget(req.query?.url);

  if (!target) {
    return res.status(400).json({ error: 'Expected a marinetraffic.com url parameter' });
  }

  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Location', target);
  return res.status(302).end();
}
