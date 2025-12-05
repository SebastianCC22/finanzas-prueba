import type { Express, Request, Response } from "express";
import { type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.all('/api/*', async (req: Request, res: Response) => {
    try {
      const targetUrl = `http://localhost:8000${req.originalUrl}`;
      const headers: Record<string, string> = {};
      
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string' && key.toLowerCase() !== 'host') {
          headers[key] = value;
        }
      }
      
      const options: RequestInit = {
        method: req.method,
        headers,
      };
      
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        options.body = JSON.stringify(req.body);
      }
      
      const response = await fetch(targetUrl, options);
      const data = await response.text();
      
      res.status(response.status);
      response.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      });
      res.send(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(502).json({ detail: 'Backend service unavailable' });
    }
  });

  return httpServer;
}
