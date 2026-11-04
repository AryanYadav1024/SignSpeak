import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['GEMINI_', 'SIGNWRITING_']);
  return {
    plugins: [{
      name: 'signbridge-local-functions',
      configureServer(server) {
        for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
        process.env.SIGNWRITING_MODEL_URL ??= 'http://127.0.0.1:8080/';

        const handlers = {
          // @ts-expect-error The deployment handler is native ESM.
          translate: () => import('./netlify/functions/translate.mjs'),
          // @ts-expect-error The deployment handler is native ESM.
          generate: () => import('./netlify/functions/generate.mjs'),
        };
        for (const [name, loadHandler] of Object.entries(handlers)) {
          server.middlewares.use(`/.netlify/functions/${name}`, async (req, res) => {
            try {
              const { default: handler } = await loadHandler();
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(Buffer.from(chunk));
              const body = ['GET', 'HEAD'].includes(req.method ?? '') ? undefined : Buffer.concat(chunks).toString();
              const headers = new Headers();
              for (const [name, value] of Object.entries(req.headers)) {
                if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
              }
              const response = await handler(new Request(`http://localhost/${name}`, { method: req.method, headers, body }));
              res.writeHead(response.status, Object.fromEntries(response.headers));
              res.end(await response.text());
            } catch {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Local translation service failed.' }));
            }
          });
        }
      },
    }],
  };
});
