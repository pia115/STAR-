import { HttpError } from './errors.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * There are no user accounts (yet). Instead, the frontend generates a random
 * UUID once (crypto.randomUUID()), keeps it in localStorage, and sends it on
 * every request in the `X-Client-Id` header. That ID scopes the gallery.
 */
export function requireClientId(req, _res, next) {
  const clientId = req.get('X-Client-Id');
  if (!clientId || !UUID_RE.test(clientId)) {
    return next(new HttpError(401, 'Missing or invalid X-Client-Id header (expected a UUID).'));
  }
  req.clientId = clientId.toLowerCase();
  next();
}
