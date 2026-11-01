import crypto from 'node:crypto';

export const SESSION_COOKIE = 'pb_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function createSessionStore(db) {
  const stmts = {
    insert: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    findUser: db.prepare(`
      SELECT u.id, u.email, u.name, u.created_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `),
    remove: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    purgeExpired: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  };

  return {
    /** Creates a session and returns the raw token (only ever sent in the cookie). */
    create(userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      stmts.insert.run(hashToken(token), userId, expiresAt);
      return token;
    },
    findUser(token) {
      if (!token) return null;
      return stmts.findUser.get(hashToken(token), new Date().toISOString()) ?? null;
    },
    destroy(token) {
      if (token) stmts.remove.run(hashToken(token));
    },
    purgeExpired() {
      stmts.purgeExpired.run(new Date().toISOString());
    },
  };
}
