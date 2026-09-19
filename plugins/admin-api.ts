import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

async function dispatch(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (pathname === '/api/admin-login') {
    const { default: handler } = await import('../api/admin-login.js');
    await handler(req, res);
    return true;
  }

  if (pathname === '/api/admin-logout') {
    const { default: handler } = await import('../api/admin-logout.js');
    await handler(req, res);
    return true;
  }

  if (pathname === '/api/admin-session') {
    const { default: handler } = await import('../api/admin-session.js');
    await handler(req, res);
    return true;
  }

  if (pathname === '/api/site-settings') {
    const { default: handler } = await import('../api/site-settings.js');
    await handler(req, res);
    return true;
  }

  return false;
}

export function adminApiPlugin(): Plugin {
  return {
    name: 'river-watch-admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const handled = await dispatch(req, res);
          if (!handled) next();
        } catch (error) {
          console.error('Admin API error:', error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        }
      });
    },
  };
}
