import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createStripsRouter } from './routes/strips.js';
import { createSharedRouter } from './routes/shared.js';
import { createMusicRouter } from './routes/music.js';
import { createBoothRouter } from './routes/booth.js';
import { createAuthRouter } from './routes/auth.js';
import { createSessionStore } from './lib/sessions.js';
import { loadUser, checkOrigin } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

/**
 * Builds the Express app. Dependencies are injected so tests can use an
 * in-memory database, a temporary upload directory, and a mock fetcher.
 */
export function createApp({
  db,
  uploadDir,
  corsOrigins = [],
  maxUploadBytes = 10 * 1024 * 1024,
  cookieSecure = false,
  trustProxy = false,
  spotify = {},
  fetcher = fetch,
}) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const sessions = createSessionStore(db);
  sessions.purgeExpired();

  const app = express();
  app.disable('x-powered-by');
  if (trustProxy) app.set('trust proxy', 1);

  app.use(cors({ origin: corsOrigins, credentials: true, allowedHeaders: ['Content-Type'] }));
  app.use(cookieParser());
  app.use(checkOrigin(corsOrigins));
  app.use(loadUser(sessions));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter({ db, sessions, cookieSecure }));
  app.use('/api/booth', createBoothRouter());
  app.use('/api/music', createMusicRouter({ spotify, fetcher }));
  app.use('/api/strips', createStripsRouter({ db, uploadDir, maxUploadBytes }));
  app.use('/api/shared', createSharedRouter({ db, uploadDir }));

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
