import type { Connect, Plugin } from 'vite';

export function resolveAppBuildId(command: 'build' | 'serve'): string {
  const fromCi = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromCi && fromCi.trim()) return fromCi.trim();
  if (command === 'build') return new Date().toISOString();
  return 'development';
}

function versionBody(buildId: string) {
  return JSON.stringify({ buildId });
}

function serveVersion(buildId: string): Connect.NextHandleFunction {
  const body = versionBody(buildId);
  return (req, res, next) => {
    const pathname = (req.url || '/').split('?')[0];
    if (pathname !== '/version.json') {
      next();
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.end(body);
  };
}

export function appVersionPlugin(buildId: string): Plugin {
  return {
    name: 'river-watch-app-version',
    configureServer(server) {
      server.middlewares.use(serveVersion(buildId));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '/').split('?')[0];
        if (pathname === '/' || pathname === '/index.html' || pathname === '/version.json' || pathname === '/sw.js') {
          res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: versionBody(buildId),
      });
    },
  };
}
