# Photobooth API (server)

Node.js + Express backend for the memory gallery. Stores photo strips in **SQLite** and the images on **disk** (in `data/`). Both can be swapped for Postgres / cloud storage later.

## Getting started

```bash
cd server
npm install
cp .env.example .env   # optional — defaults work out of the box
npm run dev            # http://localhost:4000
npm test
```

Requires Node.js 22.9+.

## Accounts & login

- Users sign up with **name, email and password** (min 8 characters).
- Passwords are hashed with **scrypt** + a random salt — never stored in plain text.
- Logging in creates a **server-side session**; the browser gets an `httpOnly`, `SameSite=Lax` cookie (`pb_session`) that JavaScript can't read. Only a SHA-256 hash of the session token is stored in the database. Sessions last 30 days.
- Login/signup are **rate-limited** (20 attempts / 15 min per IP), and state-changing requests from untrusted origins are rejected.
- Each photo strip belongs to a user — nobody else can list, edit or delete it.

In development the frontend (Vite) proxies `/api` and `/uploads` to this server, so everything is same-origin and cookies just work.

## Endpoints

### Auth

| Method | Path               | Body                        | Description |
|--------|--------------------|-----------------------------|-------------|
| `POST` | `/api/auth/signup` | `{ name, email, password }` | Create account + log in |
| `POST` | `/api/auth/login`  | `{ email, password }`       | Log in |
| `POST` | `/api/auth/logout` |                             | Log out |
| `GET`  | `/api/auth/me`     |                             | Current user (401 if logged out) |

### Photo strips (login required)

| Method   | Path              | Description |
|----------|-------------------|-------------|
| `GET`    | `/api/health`     | Health check |
| `POST`   | `/api/strips`     | Save a strip (`multipart/form-data`, see below) |
| `GET`    | `/api/strips`     | List your strips, newest first (`?limit=20&offset=0`, max 50) |
| `GET`    | `/api/strips/:id` | Get one strip |
| `PATCH`  | `/api/strips/:id` | Update `title` / `caption` (JSON body) |
| `DELETE` | `/api/strips/:id` | Delete a strip and its image |
| `GET`    | `/uploads/:file`  | The saved image (use `imageUrl` from responses) |

### `POST /api/strips` fields

| Field             | Required | Notes |
|-------------------|----------|-------|
| `image`           | ✅       | PNG, JPEG or WEBP (checked by file content), max 10 MB |
| `title`           |          | ≤ 100 chars |
| `caption`         |          | ≤ 280 chars |
| `filter`          |          | slug, e.g. `sepia`, `kodak-warm` |
| `layout`          |          | slug, e.g. `classic-4` |
| `frameCount`      |          | integer 1–8 |
| `backgroundColor` |          | hex, e.g. `#f4e9d8` |
| `takenAt`         |          | ISO date string |

Example from the frontend:

```js
const form = new FormData();
form.append('image', blob, 'strip.png'); // e.g. from canvas.toBlob()
form.append('title', 'saturday with mia');
form.append('filter', 'sepia');
form.append('frameCount', '4');

// the session cookie is sent automatically
await fetch('/api/strips', { method: 'POST', body: form, credentials: 'include' });
```

## Structure

```
server/
├── src/
│   ├── index.js            # starts the server
│   ├── app.js              # Express app setup
│   ├── config.js           # env config
│   ├── db.js               # SQLite connection + schema
│   ├── lib/                # images, passwords, sessions
│   ├── middleware/         # auth + error handling
│   └── routes/             # auth.js, strips.js
└── test/                   # auth + strips tests
```
