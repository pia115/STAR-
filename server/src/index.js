import { loadConfig } from './config.js';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDatabase(config.dbPath);
const app = createApp({
  db,
  uploadDir: config.uploadDir,
  corsOrigins: config.corsOrigins,
  maxUploadBytes: config.maxUploadBytes,
  cookieSecure: config.cookieSecure,
  trustProxy: config.trustProxy,
});

const server = app.listen(config.port, () => {
  console.log(`📸 Photobooth API listening on http://localhost:${config.port}`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
