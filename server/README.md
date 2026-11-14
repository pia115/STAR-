# Photobooth API (server)

Node.js + Express backend for the virtual vintage photobooth. Stores accounts, sessions, and photo strip metadata in **SQLite** and saved strip images on **disk** (`data/`).

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
- Each photo strip belongs to a user — nobody else can list, edit or delete it unless the owner explicitly creates a public share link.

In development the frontend (Vite) proxies `/api` and `/uploads` to this server, so everything is same-origin and cookies just work.

## Endpoints

### Auth

| Method | Path               | Body                        | Description |
|--------|--------------------|-----------------------------|-------------|
| `POST` | `/api/auth/signup` | `{ name, email, password }` | Create account + log in |
| `POST` | `/api/auth/login`  | `{ email, password }`       | Log in |
| `POST` | `/api/auth/logout` |                             | Log out |
| `GET`  | `/api/auth/me`     |                             | Current user (401 if logged out) |

### Booth Presets & Soundtrack

| Method | Path                 | Description |
|--------|----------------------|-------------|
| `GET`  | `/api/health`        | Health check |
| `GET`  | `/api/booth/presets` | Catalog of vintage `filters`, `layouts`, `borders`, `backgrounds`, and `stickers` |
| `GET`  | `/api/music/curated` | Built-in vintage booth soundtrack list (works offline with zero keys) |
| `GET`  | `/api/music/search`  | Search songs (`?q=lover&provider=auto\|apple\|spotify\|curated&limit=8`, login required) |

### Photo Strips (login required)

| Method   | Path                       | Description |
|----------|----------------------------|-------------|
| `POST`   | `/api/strips`              | Save a strip (`multipart/form-data`, see below) |
| `GET`    | `/api/strips`              | List your strips (`?limit=20&offset=0&filter=sepia&favorite=true&q=mia`) |
| `GET`    | `/api/strips/:id`          | Get one strip |
| `GET`    | `/api/strips/:id/download` | Download the strip image (`Content-Disposition: attachment`) |
| `PATCH`  | `/api/strips/:id`          | Update `title`, `caption`, `filter`, `layout`, `backgroundColor`, `borderStyle`, `dateStamp`, `stickers`, `song`, or `isFavorite` |
| `POST`   | `/api/strips/:id/share`    | Generate (or fetch) a shareable link (`/api/shared/:token`) |
| `DELETE` | `/api/strips/:id/share`    | Revoke the shareable link so the strip is private again |
| `DELETE` | `/api/strips/:id`          | Delete a strip and its image file |
| `GET`    | `/uploads/:file`           | Serve the saved image directly |

### Public Shared Strips (no login required)

| Method | Path                          | Description |
|--------|-------------------------------|-------------|
| `GET`  | `/api/shared/:token`          | View a shared strip's metadata, scrapbook details, song, and author name |
| `GET`  | `/api/shared/:token/download` | Download a shared strip image |

### `POST /api/strips` & `PATCH /api/strips/:id` fields

| Field             | Required (POST) | Notes |
|-------------------|-----------------|-------|
| `image`           | ✅              | PNG, JPEG or WEBP (checked by file magic bytes), max 10 MB |
| `title`           |                 | ≤ 100 chars |
| `caption`         |                 | ≤ 280 chars |
| `filter`          |                 | slug, e.g. `sepia`, `kodak-warm`, `bw`, `faded-film`, `flash`, `disposable-grain` |
| `layout`          |                 | slug, e.g. `classic-3`, `classic-4`, `grid-4` |
| `frameCount`      |                 | integer 1–8 |
| `backgroundColor` |                 | hex, e.g. `#f7efe2` |
| `borderStyle`     |                 | slug, e.g. `classic`, `film`, `scalloped`, `polaroid`, `floral`, `stitched` |
| `dateStamp`       |                 | ≤ 40 chars, e.g. `NOV 14 2026` |
| `stickers`        |                 | JSON array (≤ 40 items) of `{ id, type, content, x, y, scale, rotation, color }` |
| `song`            |                 | JSON object `{ id, provider, title, artist, album, artworkUrl, previewUrl, externalUrl }` |
| `isFavorite`      |                 | boolean (`true` / `false`) |
| `takenAt`         |                 | ISO date string |

## Structure

```
server/
├── src/
│   ├── index.js            # starts the server
│   ├── app.js              # Express app setup
│   ├── config.js           # env config
│   ├── db.js               # SQLite connection, schema + automatic migrations
│   ├── lib/                # images, music, passwords, presets, sessions
│   ├── middleware/         # auth + error handling
│   └── routes/             # auth.js, booth.js, music.js, shared.js, strips.js
└── test/                   # auth.test.js, strips.test.js, features.test.js
```
