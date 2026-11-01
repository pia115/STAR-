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

## How users are identified (no accounts yet)

The frontend generates a random ID once with `crypto.randomUUID()`, keeps it in `localStorage`, and sends it on every request as an `X-Client-Id` header. Each gallery belongs to that ID, so other people can't list, edit or delete your strips.

## Endpoints

All `/api/strips` routes require the `X-Client-Id` header.

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

await fetch('http://localhost:4000/api/strips', {
  method: 'POST',
  headers: { 'X-Client-Id': clientId },
  body: form,
});
```

## Structure

```
server/
├── src/
│   ├── index.js            # starts the server
│   ├── app.js              # Express app setup
│   ├── config.js           # env config
│   ├── db.js               # SQLite connection + schema
│   ├── lib/images.js       # image type detection
│   ├── middleware/         # client ID + error handling
│   └── routes/strips.js    # gallery endpoints
└── test/strips.test.js
```
