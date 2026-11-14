import path from 'node:path';
import express from 'express';
import { HttpError } from '../middleware/errors.js';
import { buildDownloadFilename, toStripDto } from './strips.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{8,32}$/;

function toSharedDto(row) {
  const base = toStripDto(row);
  return {
    id: base.id,
    authorName: row.author_name,
    title: base.title,
    caption: base.caption,
    filter: base.filter,
    layout: base.layout,
    frameCount: base.frameCount,
    backgroundColor: base.backgroundColor,
    borderStyle: base.borderStyle,
    dateStamp: base.dateStamp,
    stickers: base.stickers,
    song: base.song,
    imageUrl: base.imageUrl,
    downloadUrl: `/api/shared/${row.share_token}/download`,
    mimeType: base.mimeType,
    sizeBytes: base.sizeBytes,
    takenAt: base.takenAt,
    createdAt: base.createdAt,
  };
}

export function createSharedRouter({ db, uploadDir }) {
  const router = express.Router();

  const findByToken = db.prepare(`
    SELECT s.*, u.name AS author_name
    FROM strips s
    JOIN users u ON u.id = s.user_id
    WHERE s.share_token = ?
  `);

  const lookup = (req) => {
    const token = req.params.token;
    if (!token || !TOKEN_RE.test(token)) {
      throw new HttpError(404, 'Shared strip not found');
    }
    const row = findByToken.get(token);
    if (!row) {
      throw new HttpError(404, 'Shared strip not found');
    }
    return row;
  };

  router.get('/:token', (req, res) => {
    res.json({ strip: toSharedDto(lookup(req)) });
  });

  router.get('/:token/download', (req, res) => {
    const row = lookup(req);
    const filePath = path.join(uploadDir, row.image_file);
    res.download(filePath, buildDownloadFilename(row));
  });

  return router;
}
