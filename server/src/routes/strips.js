import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { detectImageType } from '../lib/images.js';
import { parseSongInput } from '../lib/music.js';

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const LIMITS = { title: 100, caption: 280, dateStamp: 40, stickers: 40 };

function parseStickersInput(raw, errors) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return [];

  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      errors.push('stickers must be a valid JSON array');
      return undefined;
    }
  }
  if (!Array.isArray(arr)) {
    errors.push('stickers must be an array');
    return undefined;
  }
  if (arr.length > LIMITS.stickers) {
    errors.push(`stickers can have at most ${LIMITS.stickers} items`);
    return undefined;
  }

  const normalized = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`stickers[${i}] must be an object`);
      continue;
    }
    const type = item.type === 'caption' || item.type === 'doodle' ? item.type : 'sticker';
    const content = typeof item.content === 'string' ? item.content.trim().slice(0, 80) : '';
    if (!content) {
      errors.push(`stickers[${i}].content is required`);
      continue;
    }
    const x = Number(item.x ?? 50);
    const y = Number(item.y ?? 50);
    const scale = Number(item.scale ?? 1);
    const rotation = Number(item.rotation ?? 0);
    if (!Number.isFinite(x) || x < -20 || x > 120 || !Number.isFinite(y) || y < -20 || y > 120) {
      errors.push(`stickers[${i}] coordinates x and y must be between -20 and 120`);
      continue;
    }
    if (!Number.isFinite(scale) || scale < 0.2 || scale > 5) {
      errors.push(`stickers[${i}].scale must be between 0.2 and 5`);
      continue;
    }
    if (!Number.isFinite(rotation) || rotation < -360 || rotation > 360) {
      errors.push(`stickers[${i}].rotation must be between -360 and 360`);
      continue;
    }
    const color =
      typeof item.color === 'string' && HEX_COLOR_RE.test(item.color)
        ? item.color.toLowerCase()
        : null;

    normalized.push({
      id: typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 40) : `st-${i + 1}`,
      type,
      content,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      scale: Math.round(scale * 100) / 100,
      rotation: Math.round(rotation * 10) / 10,
      color,
    });
  }

  return normalized;
}

function parseBooleanInput(raw, key, errors) {
  if (raw === undefined) return undefined;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (raw === 'true' || raw === '1' || raw === 1) return 1;
  if (raw === 'false' || raw === '0' || raw === 0) return 0;
  errors.push(`${key} must be a boolean`);
  return undefined;
}

/** Validates the metadata that accompanies a strip on POST or PATCH. */
function parseMetadata(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  const str = (key, max) => {
    if (body[key] === undefined) return;
    if (body[key] === null || body[key] === '') {
      out[key] = null;
      return;
    }
    if (typeof body[key] !== 'string') return errors.push(`${key} must be a string`);
    const v = body[key].trim();
    if (v.length > max) return errors.push(`${key} must be at most ${max} characters`);
    out[key] = v || null;
  };

  str('title', LIMITS.title);
  str('caption', LIMITS.caption);
  str('dateStamp', LIMITS.dateStamp);

  for (const key of ['filter', 'layout', 'borderStyle']) {
    if (body[key] === undefined) continue;
    if (body[key] === null || body[key] === '') {
      out[key] = null;
      continue;
    }
    if (typeof body[key] !== 'string' || !SLUG_RE.test(body[key])) {
      errors.push(`${key} must be a short slug like "sepia" or "classic-4"`);
    } else {
      out[key] = body[key].toLowerCase();
    }
  }

  if (body.backgroundColor !== undefined) {
    if (body.backgroundColor === null || body.backgroundColor === '') {
      out.backgroundColor = null;
    } else if (typeof body.backgroundColor !== 'string' || !HEX_COLOR_RE.test(body.backgroundColor)) {
      errors.push('backgroundColor must be a hex colour like "#f4e9d8"');
    } else {
      out.backgroundColor = body.backgroundColor.toLowerCase();
    }
  }

  const stickers = parseStickersInput(body.stickers, errors);
  if (stickers !== undefined) out.stickersJson = JSON.stringify(stickers);

  const song = parseSongInput(body.song, errors);
  if (song !== undefined) out.songJson = song ? JSON.stringify(song) : null;

  const isFavorite = parseBooleanInput(body.isFavorite, 'isFavorite', errors);
  if (isFavorite !== undefined) out.isFavorite = isFavorite;

  if (!partial) {
    if (body.frameCount !== undefined && body.frameCount !== '') {
      const n = Number(body.frameCount);
      if (!Number.isInteger(n) || n < 1 || n > 8) {
        errors.push('frameCount must be an integer between 1 and 8');
      } else {
        out.frameCount = n;
      }
    }

    if (body.takenAt !== undefined && body.takenAt !== '') {
      const d = new Date(body.takenAt);
      if (typeof body.takenAt !== 'string' || Number.isNaN(d.getTime())) {
        errors.push('takenAt must be an ISO date string');
      } else {
        out.takenAt = d.toISOString();
      }
    }
  }

  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

const safeJsonParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export function toStripDto(row) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    filter: row.filter,
    layout: row.layout,
    frameCount: row.frame_count,
    backgroundColor: row.background_color,
    borderStyle: row.border_style ?? null,
    dateStamp: row.date_stamp ?? null,
    stickers: safeJsonParse(row.stickers_json, []),
    song: safeJsonParse(row.song_json, null),
    isFavorite: Boolean(row.is_favorite),
    shareToken: row.share_token ?? null,
    shareUrl: row.share_token ? `/api/shared/${row.share_token}` : null,
    imageUrl: `/uploads/${row.image_file}`,
    downloadUrl: `/api/strips/${row.id}/download`,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    takenAt: row.taken_at,
    createdAt: row.created_at,
  };
}

export function buildDownloadFilename(row) {
  const ext = path.extname(row.image_file) || '.png';
  const slug = (row.title || 'photo-strip')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${slug || 'photo-strip'}${ext}`;
}

const PATCH_COLUMN_MAP = {
  title: 'title',
  caption: 'caption',
  filter: 'filter',
  layout: 'layout',
  backgroundColor: 'background_color',
  borderStyle: 'border_style',
  dateStamp: 'date_stamp',
  stickersJson: 'stickers_json',
  songJson: 'song_json',
  isFavorite: 'is_favorite',
};

export function createStripsRouter({ db, uploadDir, maxUploadBytes }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 30 },
  });

  const stmts = {
    insert: db.prepare(`
      INSERT INTO strips (
        id, user_id, title, caption, filter, layout, frame_count,
        background_color, border_style, date_stamp, stickers_json,
        song_json, is_favorite, image_file, mime_type, size_bytes, taken_at
      )
      VALUES (
        @id, @userId, @title, @caption, @filter, @layout, @frameCount,
        @backgroundColor, @borderStyle, @dateStamp, @stickersJson,
        @songJson, @isFavorite, @imageFile, @mimeType, @sizeBytes, @takenAt
      )
    `),
    get: db.prepare('SELECT * FROM strips WHERE id = ? AND user_id = ?'),
    setShareToken: db.prepare('UPDATE strips SET share_token = ? WHERE id = ? AND user_id = ?'),
    remove: db.prepare('DELETE FROM strips WHERE id = ? AND user_id = ?'),
  };

  router.use(requireAuth);

  const findOwned = (req) => {
    if (!UUID_RE.test(req.params.id)) throw new HttpError(404, 'Strip not found');
    const row = stmts.get.get(req.params.id, req.user.id);
    if (!row) throw new HttpError(404, 'Strip not found');
    return row;
  };

  // Save a new photo strip (multipart/form-data with an `image` file + metadata fields)
  router.post('/', upload.single('image'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'An "image" file is required');

    const type = detectImageType(req.file.buffer);
    if (!type) throw new HttpError(415, 'Image must be a PNG, JPEG or WEBP file');

    const meta = parseMetadata(req.body);
    const id = crypto.randomUUID();
    const imageFile = `${id}.${type.ext}`;
    const filePath = path.join(uploadDir, imageFile);

    await fs.writeFile(filePath, req.file.buffer);
    try {
      stmts.insert.run({
        id,
        userId: req.user.id,
        title: meta.title ?? null,
        caption: meta.caption ?? null,
        filter: meta.filter ?? null,
        layout: meta.layout ?? null,
        frameCount: meta.frameCount ?? null,
        backgroundColor: meta.backgroundColor ?? null,
        borderStyle: meta.borderStyle ?? null,
        dateStamp: meta.dateStamp ?? null,
        stickersJson: meta.stickersJson ?? '[]',
        songJson: meta.songJson ?? null,
        isFavorite: meta.isFavorite ?? 0,
        imageFile,
        mimeType: type.mime,
        sizeBytes: req.file.size,
        takenAt: meta.takenAt ?? null,
      });
    } catch (err) {
      await fs.rm(filePath, { force: true });
      throw err;
    }

    res.status(201).json(toStripDto(stmts.get.get(id, req.user.id)));
  });

  // List the logged-in user's strips, newest first, with optional filter/favorite/search
  router.get('/', (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    const clauses = ['user_id = @userId'];
    const params = { userId: req.user.id, limit, offset };

    if (typeof req.query.filter === 'string' && req.query.filter.trim()) {
      clauses.push('filter = @filter');
      params.filter = req.query.filter.trim().toLowerCase();
    }

    if (req.query.favorite === 'true' || req.query.favorite === '1') {
      clauses.push('is_favorite = 1');
    } else if (req.query.favorite === 'false' || req.query.favorite === '0') {
      clauses.push('is_favorite = 0');
    }

    if (typeof req.query.q === 'string' && req.query.q.trim()) {
      clauses.push('(title LIKE @q OR caption LIKE @q)');
      params.q = `%${req.query.q.trim()}%`;
    }

    const where = clauses.join(' AND ');
    const rows = db
      .prepare(`SELECT * FROM strips WHERE ${where} ORDER BY created_at DESC, rowid DESC LIMIT @limit OFFSET @offset`)
      .all(params);
    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM strips WHERE ${where}`)
      .get(params);

    res.json({ strips: rows.map(toStripDto), total, limit, offset });
  });

  router.get('/:id', (req, res) => {
    res.json(toStripDto(findOwned(req)));
  });

  // Download the strip image with a clean attachment filename
  router.get('/:id/download', (req, res) => {
    const row = findOwned(req);
    const filePath = path.join(uploadDir, row.image_file);
    res.download(filePath, buildDownloadFilename(row));
  });

  // Update strip metadata, scrapbook customizations, song, or favorite status
  router.patch('/:id', express.json({ limit: '50kb' }), (req, res) => {
    const row = findOwned(req);
    const meta = parseMetadata(req.body ?? {}, { partial: true });

    const keys = Object.keys(meta).filter((k) => PATCH_COLUMN_MAP[k]);
    if (keys.length === 0) {
      throw new HttpError(400, 'Nothing to update');
    }

    const sets = keys.map((k) => `${PATCH_COLUMN_MAP[k]} = @${k}`).join(', ');
    db.prepare(`UPDATE strips SET ${sets} WHERE id = @id AND user_id = @userId`)
      .run({ ...meta, id: row.id, userId: req.user.id });

    res.json(toStripDto(stmts.get.get(row.id, req.user.id)));
  });

  // Create (or fetch existing) public share link for a strip
  router.post('/:id/share', (req, res) => {
    const row = findOwned(req);
    let token = row.share_token;
    if (!token) {
      token = crypto.randomBytes(12).toString('base64url');
      stmts.setShareToken.run(token, row.id, req.user.id);
    }
    const updated = stmts.get.get(row.id, req.user.id);
    res.json({
      shareToken: token,
      shareUrl: `/api/shared/${token}`,
      strip: toStripDto(updated),
    });
  });

  // Revoke public share link so the strip is private again
  router.delete('/:id/share', (req, res) => {
    const row = findOwned(req);
    stmts.setShareToken.run(null, row.id, req.user.id);
    res.status(204).end();
  });

  router.delete('/:id', async (req, res) => {
    const row = findOwned(req);
    stmts.remove.run(row.id, req.user.id);
    await fs.rm(path.join(uploadDir, row.image_file), { force: true });
    res.status(204).end();
  });

  return router;
}
