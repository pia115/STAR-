import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

// Smallest valid-looking PNG header + padding (magic bytes are what we check)
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);

let app, db, uploadDir, clientId;

beforeEach(() => {
  uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photobooth-test-'));
  db = openDatabase(':memory:');
  app = createApp({ db, uploadDir, maxUploadBytes: 1024 });
  clientId = crypto.randomUUID();
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

const createStrip = (fields = {}, file = PNG, id = clientId) => {
  const req = request(app).post('/api/strips').set('X-Client-Id', id);
  for (const [k, v] of Object.entries(fields)) req.field(k, String(v));
  return req.attach('image', file, 'strip.png');
};

test('health check', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('rejects requests without a valid client id', async () => {
  assert.equal((await request(app).get('/api/strips')).status, 401);
  assert.equal((await request(app).get('/api/strips').set('X-Client-Id', 'nope')).status, 401);
});

test('creates a strip with metadata and serves the image', async () => {
  const res = await createStrip({
    title: 'Saturday with Mia',
    caption: 'best day ever ♡',
    filter: 'sepia',
    layout: 'classic-4',
    frameCount: 4,
    backgroundColor: '#F4E9D8',
    takenAt: '2026-11-01T09:00:00Z',
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Saturday with Mia');
  assert.equal(res.body.filter, 'sepia');
  assert.equal(res.body.frameCount, 4);
  assert.equal(res.body.backgroundColor, '#f4e9d8');
  assert.equal(res.body.mimeType, 'image/png');
  assert.match(res.body.imageUrl, /^\/uploads\/[0-9a-f-]{36}\.png$/);

  const img = await request(app).get(res.body.imageUrl);
  assert.equal(img.status, 200);
  assert.equal(img.headers['content-type'], 'image/png');
});

test('detects JPEG from bytes', async () => {
  const res = await createStrip({}, JPEG);
  assert.equal(res.status, 201);
  assert.equal(res.body.mimeType, 'image/jpeg');
});

test('rejects missing, non-image and oversized files', async () => {
  const noFile = await request(app).post('/api/strips').set('X-Client-Id', clientId).field('title', 'x');
  assert.equal(noFile.status, 400);

  const notImage = await createStrip({}, Buffer.from('<script>alert(1)</script>'));
  assert.equal(notImage.status, 415);

  const tooBig = await createStrip({}, Buffer.concat([PNG, Buffer.alloc(2048)]));
  assert.equal(tooBig.status, 413);
});

test('validates metadata', async () => {
  const res = await createStrip({ frameCount: 99, backgroundColor: 'red', filter: 'bad filter!' });
  assert.equal(res.status, 400);
  assert.equal(res.body.details.length, 3);
  assert.equal(fs.readdirSync(uploadDir).length, 0);
});

test('lists only the current client\'s strips, newest first, with pagination', async () => {
  await createStrip({ title: 'one' });
  await createStrip({ title: 'two' });
  await createStrip({ title: 'someone else' }, PNG, crypto.randomUUID());

  const res = await request(app).get('/api/strips?limit=1').set('X-Client-Id', clientId);
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.strips.length, 1);
  assert.equal(res.body.strips[0].title, 'two');
});

test('other clients cannot read, edit or delete a strip', async () => {
  const { body } = await createStrip();
  const other = crypto.randomUUID();
  assert.equal((await request(app).get(`/api/strips/${body.id}`).set('X-Client-Id', other)).status, 404);
  assert.equal((await request(app).patch(`/api/strips/${body.id}`).set('X-Client-Id', other).send({ title: 'x' })).status, 404);
  assert.equal((await request(app).delete(`/api/strips/${body.id}`).set('X-Client-Id', other)).status, 404);
});

test('updates title and caption', async () => {
  const { body } = await createStrip({ title: 'old' });
  const res = await request(app)
    .patch(`/api/strips/${body.id}`)
    .set('X-Client-Id', clientId)
    .send({ title: 'new', caption: 'hello' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'new');
  assert.equal(res.body.caption, 'hello');

  const empty = await request(app).patch(`/api/strips/${body.id}`).set('X-Client-Id', clientId).send({ filter: 'x' });
  assert.equal(empty.status, 400);
});

test('deletes a strip and its image file', async () => {
  const { body } = await createStrip();
  assert.equal(fs.readdirSync(uploadDir).length, 1);

  const res = await request(app).delete(`/api/strips/${body.id}`).set('X-Client-Id', clientId);
  assert.equal(res.status, 204);
  assert.equal(fs.readdirSync(uploadDir).length, 0);
  assert.equal((await request(app).get(`/api/strips/${body.id}`).set('X-Client-Id', clientId)).status, 404);
});
