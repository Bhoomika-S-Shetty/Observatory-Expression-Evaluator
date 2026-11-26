import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

const PORT = 3000;
const JAVA_PORT = Number(process.env.JAVA_PORT || 8081);
const JAVA_BASE_URL = `http://127.0.0.1:${JAVA_PORT}`;

let javaProcess: ChildProcess | null = null;

async function isJavaHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${JAVA_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data && data.status === 'UP');
  } catch {
    return false;
  }
}

async function ensureJavaBackend(): Promise<void> {
  if (await isJavaHealthy()) {
    console.log(`[Observatory] Java Spring Boot backend already running on port ${JAVA_PORT}.`);
    return;
  }

  const jarPath = path.resolve(process.cwd(), 'backend/target/observatory-backend-1.0.0.jar');
  if (fs.existsSync(jarPath)) {
    console.log('[Observatory] Starting Spring Boot JAR:', jarPath);
    javaProcess = spawn('java', ['-jar', jarPath, `--server.port=${JAVA_PORT}`], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    console.log('[Observatory] JAR not found; starting via Maven spring-boot:run...');
    javaProcess = spawn(
      'mvn',
      ['-f', 'backend/pom.xml', 'spring-boot:run', `-Dspring-boot.run.arguments=--server.port=${JAVA_PORT}`],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  }

  javaProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.log(`[SpringBoot] ${text}`);
  });

  javaProcess.stderr?.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[SpringBoot] ${text}`);
  });

  javaProcess.on('exit', (code) => {
    console.log(`[Observatory] Spring Boot process exited with code ${code}`);
    javaProcess = null;
  });

  // Wait up to 45s for Spring Boot to become healthy
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await isJavaHealthy()) {
      console.log(`[Observatory] Spring Boot backend is healthy on port ${JAVA_PORT}.`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.warn('[Observatory] Spring Boot did not respond within 45s; continuing startup.');
}

function shutdownJava() {
  if (javaProcess && !javaProcess.killed) {
    javaProcess.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  shutdownJava();
  process.exit(0);
});
process.on('SIGTERM', () => {
  shutdownJava();
  process.exit(0);
});

async function startServer() {
  await ensureJavaBackend();

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Proxy all /api/* requests to the Java Spring Boot backend
  app.all('/api/*', async (req, res) => {
    const targetUrl = `${JAVA_BASE_URL}${req.originalUrl}`;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const upstream = await fetch(targetUrl, fetchOptions);
      const rawText = await upstream.text();
      const contentType = upstream.headers.get('content-type') || 'application/json';
      res.status(upstream.status).setHeader('Content-Type', contentType).send(rawText);
    } catch (err) {
      const healthy = await isJavaHealthy();
      if (!healthy && !javaProcess) {
        ensureJavaBackend().catch(() => {});
      }
      res.status(503).json({
        success: false,
        status: 'BACKEND_UNAVAILABLE',
        errorStage: 'CONNECTION',
        errorMessage:
          err instanceof Error
            ? `Java Spring Boot engine is starting or unreachable: ${err.message}`
            : 'Java Spring Boot engine is unreachable.',
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
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Observatory] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
