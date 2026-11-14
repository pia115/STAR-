import express from 'express';
import {
  BACKGROUNDS,
  BORDERS,
  FILTERS,
  LAYOUTS,
  STICKERS,
} from '../lib/presets.js';

export function createBoothRouter() {
  const router = express.Router();

  router.get('/presets', (_req, res) => {
    res.json({
      filters: FILTERS,
      layouts: LAYOUTS,
      borders: BORDERS,
      backgrounds: BACKGROUNDS,
      stickers: STICKERS,
    });
  });

  return router;
}
