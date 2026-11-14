import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import request from 'supertest';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

let app, db, uploadDir, me, other;

const signup = async (name, email) => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signup').send({ name, email, password: 'password123' });
  assert.equal(res.status, 201);
  return agent;
};

beforeEach(async () => {
  uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photobooth-feat-'));
  db = openDatabase(':memory:');
  app = createApp({ db, uploadDir, maxUploadBytes: 10240 });
  me = await signup('Mia', 'mia@example.com');
  other = await signup('Leo', 'leo@example.com');
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

test('returns booth presets (filters, layouts, borders, backgrounds, stickers)', async () => {
  const res = await request(app).get('/api/booth/presets');
  assert.equal(res.status, 200);
  assert.ok(res.body.filters.some((f) => f.id === 'kodak-warm'));
  assert.ok(res.body.filters.some((f) => f.id === 'disposable-grain'));
  assert.ok(res.body.layouts.some((l) => l.id === 'classic-4'));
  assert.ok(res.body.borders.some((b) => b.id === 'scalloped'));
  assert.ok(res.body.backgrounds.some((bg) => bg.id === 'warm-cream'));
  assert.ok(res.body.stickers.length > 0);
});

test('saves and updates scrapbook studio stickers, border, dateStamp, song, and favorite', async () => {
  const stickers = [
    { id: 's1', type: 'sticker', content: '✦', x: 18.5, y: 22.1, scale: 1.2, rotation: -12, color: '#d9b443' },
    { id: 'c1', type: 'caption', content: 'best night!', x: 50, y: 88, scale: 1, rotation: 2 },
  ];
  const song = {
    id: 'apple-123',
    provider: 'apple',
    title: 'Dreams',
    artist: 'Fleetwood Mac',
    album: 'Rumours',
    artworkUrl: 'https://example.com/art.jpg',
    previewUrl: 'https://example.com/preview.m4a',
  };

  const created = await me
    .post('/api/strips')
    .field('title', 'Arcade Night')
    .field('filter', 'kodak-warm')
    .field('borderStyle', 'film')
    .field('dateStamp', 'NOV 14 2026')
    .field('isFavorite', 'true')
    .field('stickers', JSON.stringify(stickers))
    .field('song', JSON.stringify(song))
    .attach('image', PNG, 'strip.png');

  assert.equal(created.status, 201);
  assert.equal(created.body.borderStyle, 'film');
  assert.equal(created.body.dateStamp, 'NOV 14 2026');
  assert.equal(created.body.isFavorite, true);
  assert.equal(created.body.stickers.length, 2);
  assert.equal(created.body.stickers[0].content, '✦');
  assert.equal(created.body.song.title, 'Dreams');
  assert.equal(created.body.song.artist, 'Fleetwood Mac');

  // Update via PATCH with JSON objects directly
  const patched = await me.patch(`/api/strips/${created.body.id}`).send({
    borderStyle: 'scalloped',
    isFavorite: false,
    stickers: [{ type: 'sticker', content: '♡', x: 40, y: 60 }],
    song: null,
  });

  assert.equal(patched.status, 200);
  assert.equal(patched.body.borderStyle, 'scalloped');
  assert.equal(patched.body.isFavorite, false);
  assert.equal(patched.body.stickers.length, 1);
  assert.equal(patched.body.song, null);
});

test('filters gallery strips by filter, favorite, and search query', async () => {
  await me
    .post('/api/strips')
    .field('title', 'Beach Sunset')
    .field('caption', 'golden hour')
    .field('filter', 'kodak-warm')
    .field('isFavorite', 'true')
    .attach('image', PNG, '1.png');

  await me
    .post('/api/strips')
    .field('title', 'Rainy Cafe')
    .field('caption', 'espresso and jazz')
    .field('filter', 'bw')
    .field('isFavorite', 'false')
    .attach('image', PNG, '2.png');

  const favs = await me.get('/api/strips?favorite=true');
  assert.equal(favs.body.total, 1);
  assert.equal(favs.body.strips[0].title, 'Beach Sunset');

  const bw = await me.get('/api/strips?filter=bw');
  assert.equal(bw.body.total, 1);
  assert.equal(bw.body.strips[0].title, 'Rainy Cafe');

  const search = await me.get('/api/strips?q=espresso');
  assert.equal(search.body.total, 1);
  assert.equal(search.body.strips[0].title, 'Rainy Cafe');
});

test('creates, views, downloads, and revokes shareable links', async () => {
  const { body: strip } = await me
    .post('/api/strips')
    .field('title', 'Sunday with Mia')
    .field('filter', 'sepia')
    .attach('image', PNG, 'strip.png');

  // Create share link
  const shareRes = await me.post(`/api/strips/${strip.id}/share`);
  assert.equal(shareRes.status, 200);
  assert.ok(shareRes.body.shareToken);
  assert.equal(shareRes.body.shareUrl, `/api/shared/${shareRes.body.shareToken}`);

  // Calling share again returns the same token
  const shareAgain = await me.post(`/api/strips/${strip.id}/share`);
  assert.equal(shareAgain.body.shareToken, shareRes.body.shareToken);

  // Anyone (unauthenticated) can view the shared strip
  const pub = await request(app).get(shareRes.body.shareUrl);
  assert.equal(pub.status, 200);
  assert.equal(pub.body.strip.title, 'Sunday with Mia');
  assert.equal(pub.body.strip.authorName, 'Mia');

  // Download shared strip and owner strip with Content-Disposition attachment
  const pubDl = await request(app).get(pub.body.strip.downloadUrl);
  assert.equal(pubDl.status, 200);
  assert.match(pubDl.headers['content-disposition'], /attachment; filename="?sunday-with-mia\.png"?/);

  const ownerDl = await me.get(strip.downloadUrl);
  assert.equal(ownerDl.status, 200);
  assert.match(ownerDl.headers['content-disposition'], /attachment; filename="?sunday-with-mia\.png"?/);

  // Other users cannot manage Mia's share link
  assert.equal((await other.delete(`/api/strips/${strip.id}/share`)).status, 404);

  // Revoke share link
  const revoke = await me.delete(`/api/strips/${strip.id}/share`);
  assert.equal(revoke.status, 204);
  assert.equal((await request(app).get(shareRes.body.shareUrl)).status, 404);
});

test('music curated endpoint and search with Apple Music & Spotify mocks', async () => {
  const curated = await request(app).get('/api/music/curated');
  assert.equal(curated.status, 200);
  assert.ok(curated.body.tracks.length >= 5);

  // Mock fetcher for Apple Music and Spotify
  const mockFetcher = async (url) => {
    const u = String(url);
    if (u.includes('itunes.apple.com')) {
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              trackId: 99,
              trackName: 'Lover',
              artistName: 'Taylor Swift',
              collectionName: 'Lover',
              artworkUrl100: 'https://example.com/100x100bb.jpg',
              previewUrl: 'https://example.com/lover.m4a',
              trackViewUrl: 'https://music.apple.com/track/99',
              trackTimeMillis: 221000,
            },
          ],
        }),
      };
    }
    if (u.includes('accounts.spotify.com')) {
      return {
        ok: true,
        json: async () => ({ access_token: 'tok-123', expires_in: 3600 }),
      };
    }
    if (u.includes('api.spotify.com')) {
      return {
        ok: true,
        json: async () => ({
          tracks: {
            items: [
              {
                id: 'sp1',
                name: 'Golden Hour',
                artists: [{ name: 'JVKE' }],
                album: { name: 'this is what ____ feels like', images: [{ url: 'https://example.com/sp.jpg' }] },
                preview_url: 'https://example.com/sp.mp3',
                external_urls: { spotify: 'https://open.spotify.com/track/sp1' },
                duration_ms: 209000,
              },
            ],
          },
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  const musicApp = createApp({
    db,
    uploadDir,
    spotify: { clientId: 'id', clientSecret: 'secret' },
    fetcher: mockFetcher,
  });
  const agent = request.agent(musicApp);
  await agent.post('/api/auth/login').send({ email: 'mia@example.com', password: 'password123' });

  const appleRes = await agent.get('/api/music/search?q=lover&provider=apple');
  assert.equal(appleRes.status, 200);
  assert.equal(appleRes.body.provider, 'apple');
  assert.equal(appleRes.body.tracks[0].title, 'Lover');
  assert.match(appleRes.body.tracks[0].artworkUrl, /300x300bb/);

  const spotifyRes = await agent.get('/api/music/search?q=golden&provider=spotify');
  assert.equal(spotifyRes.status, 200);
  assert.equal(spotifyRes.body.provider, 'spotify');
  assert.equal(spotifyRes.body.tracks[0].title, 'Golden Hour');
  assert.equal(spotifyRes.body.tracks[0].artist, 'JVKE');
});

test('migrates an older strips table missing new columns', () => {
  const tmpDbPath = path.join(uploadDir, 'legacy.db');
  const legacy = new Database(tmpDbPath);
  legacy.exec(`
    CREATE TABLE strips (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      caption TEXT,
      filter TEXT,
      layout TEXT,
      frame_count INTEGER,
      background_color TEXT,
      image_file TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      taken_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  legacy.close();

  const migrated = openDatabase(tmpDbPath);
  const cols = migrated.prepare('PRAGMA table_info(strips)').all().map((c) => c.name);
  assert.ok(cols.includes('border_style'));
  assert.ok(cols.includes('stickers_json'));
  assert.ok(cols.includes('song_json'));
  assert.ok(cols.includes('is_favorite'));
  assert.ok(cols.includes('share_token'));
  migrated.close();
});
