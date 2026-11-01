import { HttpError } from './errors.js';
import { SESSION_COOKIE } from '../lib/sessions.js';

/** Reads the session cookie (if any) and attaches the logged-in user to req.user. */
export function loadUser(sessions) {
  return (req, _res, next) => {
    req.sessionToken = req.cookies?.[SESSION_COOKIE];
    req.user = sessions.findUser(req.sessionToken);
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Please log in first.'));
  next();
}

/**
 * Extra CSRF protection on top of SameSite cookies: reject state-changing
 * requests that come from an origin we don't trust.
 */
export function checkOrigin(allowedOrigins) {
  const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);
  return (req, _res, next) => {
    const origin = req.get('Origin');
    if (SAFE.has(req.method) || !origin) return next();
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
    if (sameOrigin || allowedOrigins.includes(origin)) return next();
    next(new HttpError(403, 'Request origin not allowed'));
  };
}
