import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

let app, db, uploadDir;

beforeEach(() => {
  uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photobooth-auth-'));
  db = openDatabase(':memory:');
  app = createApp({ db, uploadDir, corsOrigins: ['http://localhost:5173'] });
});

afterEach(() => {
  db.close();
  fs.rmSync(uploadDir, { recursive: true, force: true });
});

const USER = { name: 'Mia', email: 'Mia@Example.com', password: 'film-darling-42' };

test('signup creates an account, sets an httpOnly cookie and logs in', async () => {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/signup').send(USER);

  assert.equal(res.status, 201);
  assert.equal(res.body.user.email, 'mia@example.com');
  assert.equal(res.body.user.name, 'Mia');
  assert.equal(res.body.user.password_hash, undefined);

  const cookie = res.headers['set-cookie'][0];
  assert.match(cookie, /pb_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);

  const me = await agent.get('/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'mia@example.com');
});

test('passwords are stored hashed, never in plain text', async () => {
  await request(app).post('/api/auth/signup').send(USER);
  const row = db.prepare('SELECT password_hash FROM users').get();
  assert.ok(row.password_hash.startsWith('scrypt$'));
  assert.ok(!row.password_hash.includes(USER.password));
});

test('signup validation and duplicate emails', async () => {
  const bad = await request(app).post('/api/auth/signup').send({ name: '', email: 'nope', password: 'short' });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.details.length, 3);

  await request(app).post('/api/auth/signup').send(USER);
  const dupe = await request(app).post('/api/auth/signup').send({ ...USER, email: 'mia@example.com' });
  assert.equal(dupe.status, 409);
});

test('login with correct and incorrect credentials', async () => {
  await request(app).post('/api/auth/signup').send(USER);

  const wrong = await request(app).post('/api/auth/login').send({ email: USER.email, password: 'wrong-password' });
  assert.equal(wrong.status, 401);
  const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'whatever1' });
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error, unknown.body.error);

  const agent = request.agent(app);
  const ok = await agent.post('/api/auth/login').send({ email: 'MIA@example.com', password: USER.password });
  assert.equal(ok.status, 200);
  assert.equal((await agent.get('/api/auth/me')).status, 200);
});

test('logout ends the session', async () => {
  const agent = request.agent(app);
  await agent.post('/api/auth/signup').send(USER);
  assert.equal((await agent.post('/api/auth/logout')).status, 204);
  assert.equal((await agent.get('/api/auth/me')).status, 401);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
});

test('me without a session is 401', async () => {
  assert.equal((await request(app).get('/api/auth/me')).status, 401);
  assert.equal((await request(app).get('/api/auth/me').set('Cookie', 'pb_session=forged')).status, 401);
});

test('rejects state-changing requests from untrusted origins', async () => {
  const evil = await request(app).post('/api/auth/signup').set('Origin', 'https://evil.example').send(USER);
  assert.equal(evil.status, 403);
  const good = await request(app).post('/api/auth/signup').set('Origin', 'http://localhost:5173').send(USER);
  assert.equal(good.status, 201);
});

test('rate limits repeated login attempts', async () => {
  let last;
  for (let i = 0; i < 21; i++) {
    last = await request(app).post('/api/auth/login').send({ email: 'x@example.com', password: 'nope' });
  }
  assert.equal(last.status, 429);
});
