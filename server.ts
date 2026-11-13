import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post('/api/bridge', (req, res) => {
    const pythonDir = path.join(__dirname, 'python_project');
    const proc = spawnSync('python3', ['-m', 'app.cli_bridge'], {
      cwd: pythonDir,
      input: JSON.stringify(req.body || {}),
      encoding: 'utf-8',
      timeout: 8000,
    });

    if (proc.error) {
      res.status(500).json({ ok: false, error: proc.error.message });
      return;
    }

    try {
      const parsed = JSON.parse(proc.stdout.trim());
      if (!parsed.ok) {
        res.status(parsed.status || 400).json(parsed);
        return;
      }
      res.json(parsed);
    } catch {
      res.status(500).json({
        ok: false,
        error: proc.stderr || proc.stdout || 'Error en ejecucion del servicio Python.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
