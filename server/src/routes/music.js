import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import {
  CURATED_TRACKS,
  filterCuratedTracks,
  searchAppleMusic,
  searchSpotify,
} from '../lib/music.js';

export function createMusicRouter({ spotify = {}, fetcher = fetch } = {}) {
  const router = express.Router();

  const hasSpotify = Boolean(spotify?.clientId && spotify?.clientSecret);

  // Curated booth soundtrack list (works offline with zero setup)
  router.get('/curated', (_req, res) => {
    res.json({
      provider: 'curated',
      providersAvailable: ['curated', 'apple', ...(hasSpotify ? ['spotify'] : [])],
      tracks: CURATED_TRACKS,
    });
  });

  // Search songs across Apple Music / Spotify / Curated catalog
  router.get('/search', requireAuth, async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 20);
    const requestedProvider =
      typeof req.query.provider === 'string' ? req.query.provider.toLowerCase() : 'auto';

    if (!q) {
      return res.json({
        provider: 'curated',
        tracks: filterCuratedTracks('', limit),
      });
    }

    if (q.length > 100) {
      throw new HttpError(400, 'Search query must be at most 100 characters');
    }

    if (requestedProvider === 'curated') {
      return res.json({
        provider: 'curated',
        tracks: filterCuratedTracks(q, limit),
      });
    }

    if (requestedProvider === 'spotify') {
      if (!hasSpotify) {
        throw new HttpError(
          503,
          'Spotify is not configured on this server (set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)',
        );
      }
      const tracks = await searchSpotify(q, limit, spotify, fetcher);
      return res.json({ provider: 'spotify', tracks });
    }

    if (requestedProvider !== 'auto' && requestedProvider !== 'apple') {
      throw new HttpError(400, 'provider must be one of: auto, apple, spotify, curated');
    }

    // Default ('auto' or 'apple'): try Spotify if configured & auto, otherwise Apple Music,
    // and fall back to curated tracks if offline.
    try {
      if (requestedProvider === 'auto' && hasSpotify) {
        const tracks = await searchSpotify(q, limit, spotify, fetcher);
        return res.json({ provider: 'spotify', tracks });
      }
      const tracks = await searchAppleMusic(q, limit, fetcher);
      return res.json({ provider: 'apple', tracks });
    } catch (err) {
      if (requestedProvider === 'apple') {
        throw new HttpError(502, `Music search failed: ${err.message}`);
      }
      return res.json({
        provider: 'curated',
        fallback: true,
        tracks: filterCuratedTracks(q, limit),
      });
    }
  });

  return router;
}
