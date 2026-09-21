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

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Hands off to MarineTraffic from a script instead of an HTTP redirect.
 * MarineTraffic claims every path on its domain for its mobile app, and the app
 * only resolves links carrying its internal shipid, so a vessel link that
 * reaches the app lands on the app home screen with no ship. WebKit only hands
 * a universal link to an app on a user-initiated navigation, and a 302 still
 * counts as one in Chrome for iOS, so this page navigates itself instead.
 *
 * @param {string} target
 * @returns {string}
 */
export function renderHandoffPage(target) {
  const href = escapeHtml(target);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Opening MarineTraffic</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #f8fafc; color: #475569; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .panel { text-align: center; padding: 1.5rem; }
  .panel p { font-size: 0.9375rem; font-weight: 600; margin: 0 0 0.75rem; }
  .panel a { color: #2563eb; font-size: 0.875rem; }
</style>
</head>
<body>
<div class="panel">
  <p>Opening MarineTraffic&hellip;</p>
  <a href="${href}">Continue to the vessel page</a>
</div>
<script>window.location.replace(${JSON.stringify(target)});</script>
</body>
</html>
`;
}

export default function handler(req, res) {
  const target = resolveTarget(req.query?.url);

  if (!target) {
    return res.status(400).json({ error: 'Expected a marinetraffic.com url parameter' });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(renderHandoffPage(target));
}
