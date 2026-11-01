import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { createStripsRouter } from './routes/strips.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

/**
 * Builds the Express app. Dependencies are injected so tests can use an
 * in-memory database and a temporary upload directory.
 */
export function createApp({ db, uploadDir, corsOrigins = [], maxUploadBytes = 10 * 1024 * 1024 }) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const app = express();
  app.disable('x-powered-by');

  app.use(cors({ origin: corsOrigins, allowedHeaders: ['Content-Type', 'X-Client-Id'] }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/strips', createStripsRouter({ db, uploadDir, maxUploadBytes }));

  // Saved photo strip images. Filenames are random UUIDs, so they work as
  // unguessable links that can be used directly in <img> tags.
  app.use(
    '/uploads',
    express.static(uploadDir, {
      index: false,
      dotfiles: 'deny',
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
