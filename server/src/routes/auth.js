import crypto from 'node:crypto';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword, verifyPassword, burnPasswordCheck } from '../lib/passwords.js';
import { SESSION_COOKIE, SESSION_TTL_MS } from '../lib/sessions.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toUserDto = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at });

function validateCredentials(body, { signup }) {
  const errors = [];
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!EMAIL_RE.test(email) || email.length > 254) errors.push('Please enter a valid email address');
  if (signup) {
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (password.length > 128) errors.push('Password must be at most 128 characters');
    if (!name) errors.push('Please enter your name');
    if (name.length > 50) errors.push('Name must be at most 50 characters');
  } else if (!password) {
    errors.push('Please enter your password');
  }

  if (errors.length) throw new HttpError(400, errors[0], errors);
  return { email, password, name };
}

export function createAuthRouter({ db, sessions, cookieSecure }) {
  const router = express.Router();
  router.use(express.json({ limit: '10kb' }));

  // Slow down password guessing: 20 attempts per 15 minutes per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts — please wait a few minutes and try again.' },
  });

  const stmts = {
    byEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    byId: db.prepare('SELECT * FROM users WHERE id = ?'),
    insert: db.prepare('INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)'),
  };

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure,
    path: '/',
  };

  const startSession = (res, userId) => {
    const token = sessions.create(userId);
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS });
  };

  router.post('/signup', limiter, async (req, res) => {
    const { email, password, name } = validateCredentials(req.body ?? {}, { signup: true });

    if (stmts.byEmail.get(email)) {
      throw new HttpError(409, 'An account with this email already exists');
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    try {
      stmts.insert.run(id, email, name, passwordHash);
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new HttpError(409, 'An account with this email already exists');
      }
      throw err;
    }

    startSession(res, id);
    res.status(201).json({ user: toUserDto(stmts.byId.get(id)) });
  });

  router.post('/login', limiter, async (req, res) => {
    const { email, password } = validateCredentials(req.body ?? {}, { signup: false });

    const user = stmts.byEmail.get(email);
    const ok = user
      ? await verifyPassword(password, user.password_hash)
      : await burnPasswordCheck(password);
    if (!ok) throw new HttpError(401, 'Incorrect email or password');

    // Rotate: drop any session the browser already had before issuing a new one
    sessions.destroy(req.sessionToken);
    startSession(res, user.id);
    res.json({ user: toUserDto(user) });
  });

  router.post('/logout', (req, res) => {
    sessions.destroy(req.sessionToken);
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: toUserDto(req.user) });
  });

  return router;
}
