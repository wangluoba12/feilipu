import { createServer, IncomingMessage, ServerResponse, Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { log } from './logger';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type ApiHandler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>) => Promise<void> | void;

interface ApiRoute {
  method: HttpMethod;
  path: string;
  handler: ApiHandler;
}

interface SseClient {
  id: string;
  res: ServerResponse;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.ts': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let sseClientId = 0;

export class WebuiServer {
  private server: Server | null = null;
  private routes: ApiRoute[] = [];
  private sseClients: Map<string, SseClient> = new Map();
  private staticDir: string = '';

  setStaticDir(dir: string): void {
    this.staticDir = dir;
  }

  registerRoute(method: HttpMethod, path: string, handler: ApiHandler): void {
    this.routes.push({ method, path, handler });
  }

  get(path: string, handler: ApiHandler): void {
    this.registerRoute('GET', path, handler);
  }

  post(path: string, handler: ApiHandler): void {
    this.registerRoute('POST', path, handler);
  }

  put(path: string, handler: ApiHandler): void {
    this.registerRoute('PUT', path, handler);
  }

  delete(path: string, handler: ApiHandler): void {
    this.registerRoute('DELETE', path, handler);
  }

  async start(port: number, host: string = '0.0.0.0'): Promise<void> {
    this.server = createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (err) {
        log.error('Unhandled request error', { error: String(err) });
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      }
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(port, host, () => {
        log.info(`WebUI server started on http://${host}:${port}`);
        resolve();
      });

      this.server!.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log.warn(`Port ${port} is in use, trying ${port + 1}`);
          this.server!.close();
          this.start(port + 1, host).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  async stop(): Promise<void> {
    for (const client of this.sseClients.values()) {
      client.res.end();
    }
    this.sseClients.clear();

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          log.info('WebUI server stopped');
          resolve();
        });
      });
    }
  }

  broadcastEvent(event: Record<string, unknown>): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.sseClients.values()) {
      client.res.write(data);
    }
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      await this.handleApi(req, res, pathname);
    } else if (pathname === '/api/events/stream') {
      await this.handleSseConnect(req, res);
    } else {
      await this.handleStatic(req, res, pathname);
    }
  }

  private async handleApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
    const body = await this.parseBody(req);

    for (const route of this.routes) {
      const match = this.matchRoute(req.method as HttpMethod, pathname, route);
      if (match) {
        try {
          await route.handler(req, res, match);
        } catch (err) {
          log.error('API handler error', { path: pathname, error: String(err) });
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        }
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }

  private matchRoute(
    method: string,
    pathname: string,
    route: ApiRoute
  ): Record<string, string> | null {
    if (route.method !== method) return null;

    const routeParts = route.path.split('/');
    const pathParts = pathname.split('/');

    if (routeParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  private async handleStatic(_req: IncomingMessage, res: ServerResponse, pathname: string): Promise<void> {
    if (!this.staticDir) {
      res.writeHead(404);
      res.end('Static directory not configured');
      return;
    }

    let filePath = pathname === '/' ? '/index.html' : pathname;
    const fullPath = join(this.staticDir, filePath);

    try {
      const content = await readFile(fullPath);
      const ext = extname(fullPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
    } catch {
      const indexPath = join(this.staticDir, 'index.html');
      try {
        const content = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not Found');
      }
    }
  }

  private async parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (req.method === 'GET' || req.method === 'DELETE') return {};

    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({ raw: data });
        }
      });
    });
  }

  private handleSseConnect(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const clientId = String(++sseClientId);
    this.sseClients.set(clientId, { id: clientId, res });

    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    req.on('close', () => {
      this.sseClients.delete(clientId);
    });
  }
}
