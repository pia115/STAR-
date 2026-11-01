import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { detectImageType } from '../lib/images.js';

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const UUID_RE = /^[0-9a-f-]{36}$/i;

const LIMITS = { title: 100, caption: 280 };

/** Validates the optional text metadata that accompanies a strip. */
function parseMetadata(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  const str = (key, max) => {
    if (body[key] === undefined) return;
    if (body[key] === null || body[key] === '') { out[key] = null; return; }
    if (typeof body[key] !== 'string') return errors.push(`${key} must be a string`);
    const v = body[key].trim();
    if (v.length > max) return errors.push(`${key} must be at most ${max} characters`);
    out[key] = v || null;
  };

  str('title', LIMITS.title);
  str('caption', LIMITS.caption);

  if (!partial) {
    for (const key of ['filter', 'layout']) {
      if (body[key] === undefined || body[key] === '') continue;
      if (typeof body[key] !== 'string' || !SLUG_RE.test(body[key])) {
        errors.push(`${key} must be a short slug like "sepia" or "classic-4"`);
      } else {
        out[key] = body[key].toLowerCase();
      }
    }

    if (body.frameCount !== undefined && body.frameCount !== '') {
      const n = Number(body.frameCount);
      if (!Number.isInteger(n) || n < 1 || n > 8) errors.push('frameCount must be an integer between 1 and 8');
      else out.frameCount = n;
    }

    if (body.backgroundColor !== undefined && body.backgroundColor !== '') {
      if (typeof body.backgroundColor !== 'string' || !HEX_COLOR_RE.test(body.backgroundColor)) {
        errors.push('backgroundColor must be a hex colour like "#f4e9d8"');
      } else {
        out.backgroundColor = body.backgroundColor.toLowerCase();
      }
    }

    if (body.takenAt !== undefined && body.takenAt !== '') {
      const d = new Date(body.takenAt);
      if (typeof body.takenAt !== 'string' || Number.isNaN(d.getTime())) errors.push('takenAt must be an ISO date string');
      else out.takenAt = d.toISOString();
    }
  }

  if (errors.length) throw new HttpError(400, 'Validation failed', errors);
  return out;
}

function toDto(row) {
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    filter: row.filter,
    layout: row.layout,
    frameCount: row.frame_count,
    backgroundColor: row.background_color,
    imageUrl: `/uploads/${row.image_file}`,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    takenAt: row.taken_at,
    createdAt: row.created_at,
  };
}

export function createStripsRouter({ db, uploadDir, maxUploadBytes }) {
  const router = express.Router();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 20 },
  });

  const stmts = {
    insert: db.prepare(`
      INSERT INTO strips (id, user_id, title, caption, filter, layout, frame_count,
                          background_color, image_file, mime_type, size_bytes, taken_at)
      VALUES (@id, @userId, @title, @caption, @filter, @layout, @frameCount,
              @backgroundColor, @imageFile, @mimeType, @sizeBytes, @takenAt)
    `),
    get: db.prepare('SELECT * FROM strips WHERE id = ? AND user_id = ?'),
    list: db.prepare(`
      SELECT * FROM strips WHERE user_id = ?
      ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?
    `),
    count: db.prepare('SELECT COUNT(*) AS total FROM strips WHERE user_id = ?'),
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
        imageFile,
        mimeType: type.mime,
        sizeBytes: req.file.size,
        takenAt: meta.takenAt ?? null,
      });
    } catch (err) {
      await fs.rm(filePath, { force: true });
      throw err;
    }

    res.status(201).json(toDto(stmts.get.get(id, req.user.id)));
  });

  // List the logged-in user's strips, newest first
  router.get('/', (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const rows = stmts.list.all(req.user.id, limit, offset);
    const { total } = stmts.count.get(req.user.id);
    res.json({ strips: rows.map(toDto), total, limit, offset });
  });

  router.get('/:id', (req, res) => {
    res.json(toDto(findOwned(req)));
  });

  // Update title / caption
  router.patch('/:id', express.json({ limit: '10kb' }), (req, res) => {
    const row = findOwned(req);
    const meta = parseMetadata(req.body ?? {}, { partial: true });

    const fields = Object.keys(meta);
    if (fields.length === 0) throw new HttpError(400, 'Nothing to update (allowed: title, caption)');

    const sets = fields.map((f) => `${f} = @${f}`).join(', ');
    db.prepare(`UPDATE strips SET ${sets} WHERE id = @id AND user_id = @userId`)
      .run({ ...meta, id: row.id, userId: req.user.id });

    res.json(toDto(stmts.get.get(row.id, req.user.id)));
  });

  router.delete('/:id', async (req, res) => {
    const row = findOwned(req);
    stmts.remove.run(row.id, req.user.id);
    await fs.rm(path.join(uploadDir, row.image_file), { force: true });
    res.status(204).end();
  });

  return router;
}
