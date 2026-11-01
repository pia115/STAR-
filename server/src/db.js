import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS strips (
    id               TEXT PRIMARY KEY,
    client_id        TEXT NOT NULL,
    title            TEXT,
    caption          TEXT,
    filter           TEXT,
    layout           TEXT,
    frame_count      INTEGER,
    background_color TEXT,
    image_file       TEXT NOT NULL,
    mime_type        TEXT NOT NULL,
    size_bytes       INTEGER NOT NULL,
    taken_at         TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_strips_client_created
    ON strips (client_id, created_at DESC);
`;

/**
 * Opens (or creates) the SQLite database and applies the schema.
 * Pass ':memory:' for an in-memory database (used in tests).
 */
export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
