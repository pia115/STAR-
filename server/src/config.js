import path from 'node:path';

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function loadConfig(env = process.env) {
  const dataDir = path.resolve(env.DATA_DIR || './data');

  return {
    port: toInt(env.PORT, 4000),
    dataDir,
    dbPath: path.join(dataDir, 'photobooth.db'),
    uploadDir: path.join(dataDir, 'uploads'),
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    maxUploadBytes: toInt(env.MAX_UPLOAD_MB, 10) * 1024 * 1024,
  };
}
