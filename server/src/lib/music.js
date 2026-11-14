export const CURATED_TRACKS = [
  {
    id: 'curated-honeyflash',
    provider: 'curated',
    title: 'Sunday Polaroid',
    artist: 'The Velvet Curtains',
    album: 'Coin-Op Memories (1974)',
    artworkUrl: null,
    previewUrl: null,
    externalUrl: null,
    durationMs: 174000,
  },
  {
    id: 'curated-clickclub',
    provider: 'curated',
    title: '3, 2, 1, Smile!',
    artist: 'Honeyflash & The Bulbs',
    album: 'Arcade Corner',
    artworkUrl: null,
    previewUrl: null,
    externalUrl: null,
    durationMs: 158000,
  },
  {
    id: 'curated-sepia-dreams',
    provider: 'curated',
    title: 'Sepia Afternoon',
    artist: 'Little Moments',
    album: '35mm Daydream',
    artworkUrl: null,
    previewUrl: null,
    externalUrl: null,
    durationMs: 192000,
  },
  {
    id: 'curated-afterglow',
    provider: 'curated',
    title: 'Afterglow in the Booth',
    artist: 'Film Darling',
    album: 'Warm Cream & Dusty Rose',
    artworkUrl: null,
    previewUrl: null,
    externalUrl: null,
    durationMs: 205000,
  },
  {
    id: 'curated-cherry-soda',
    provider: 'curated',
    title: 'Cherry Soda Jukebox',
    artist: 'The Snapettes',
    album: 'Side A / Side B',
    artworkUrl: null,
    previewUrl: null,
    externalUrl: null,
    durationMs: 164000,
  },
];

export function filterCuratedTracks(query = '', limit = 8) {
  const q = query.trim().toLowerCase();
  const list = !q
    ? CURATED_TRACKS
    : CURATED_TRACKS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q)),
      );
  return list.slice(0, limit);
}

/**
 * Searches Apple Music / iTunes catalog (no API key required).
 */
export async function searchAppleMusic(query, limit = 8, fetcher = fetch) {
  const url = new URL('https://itunes.apple.com/search');
  url.searchParams.set('media', 'music');
  url.searchParams.set('entity', 'song');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('term', query);

  const res = await fetcher(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`Apple Music search returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  return results
    .filter((item) => item && item.trackName && item.artistName)
    .slice(0, limit)
    .map((item) => ({
      id: `apple-${item.trackId}`,
      provider: 'apple',
      title: String(item.trackName),
      artist: String(item.artistName),
      album: item.collectionName ? String(item.collectionName) : null,
      artworkUrl: item.artworkUrl100
        ? String(item.artworkUrl100).replace('100x100bb', '300x300bb')
        : null,
      previewUrl: item.previewUrl ? String(item.previewUrl) : null,
      externalUrl: item.trackViewUrl ? String(item.trackViewUrl) : null,
      durationMs: Number.isFinite(item.trackTimeMillis) ? item.trackTimeMillis : null,
    }));
}

let cachedSpotifyToken = null;

/**
 * Searches Spotify catalog using Client Credentials flow when SPOTIFY_CLIENT_ID
 * and SPOTIFY_CLIENT_SECRET are configured.
 */
export async function searchSpotify(
  query,
  limit = 8,
  { clientId, clientSecret } = {},
  fetcher = fetch,
) {
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not configured');
  }

  const now = Date.now();
  if (!cachedSpotifyToken || cachedSpotifyToken.expiresAt <= now) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetcher('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(6000),
    });
    if (!tokenRes.ok) {
      throw new Error(`Spotify auth failed with HTTP ${tokenRes.status}`);
    }
    const tokenData = await tokenRes.json();
    cachedSpotifyToken = {
      token: tokenData.access_token,
      expiresAt: now + Math.max((tokenData.expires_in || 3600) - 60, 60) * 1000,
    };
  }

  const url = new URL('https://api.spotify.com/v1/search');
  url.searchParams.set('type', 'track');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('q', query);

  const res = await fetcher(url.toString(), {
    headers: { Authorization: `Bearer ${cachedSpotifyToken.token}` },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    throw new Error(`Spotify search returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.tracks?.items) ? data.tracks.items : [];

  return items.slice(0, limit).map((item) => ({
    id: `spotify-${item.id}`,
    provider: 'spotify',
    title: String(item.name),
    artist: Array.isArray(item.artists) ? item.artists.map((a) => a.name).join(', ') : 'Unknown',
    album: item.album?.name ? String(item.album.name) : null,
    artworkUrl: item.album?.images?.[0]?.url ? String(item.album.images[0].url) : null,
    previewUrl: item.preview_url ? String(item.preview_url) : null,
    externalUrl: item.external_urls?.spotify ? String(item.external_urls.spotify) : null,
    durationMs: Number.isFinite(item.duration_ms) ? item.duration_ms : null,
  }));
}

const VALID_PROVIDERS = new Set(['apple', 'spotify', 'curated', 'custom']);

const isSafeHttpUrl = (val) => {
  if (val === null || val === undefined || val === '') return true;
  if (typeof val !== 'string' || val.length > 500) return false;
  try {
    const u = new URL(val);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Validates and normalizes an optional `song` object (or JSON string) to store
 * on a photo strip.
 */
export function parseSongInput(raw, errors = []) {
  if (raw === undefined) return undefined;
  if (raw === null || raw === '') return null;

  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      errors.push('song must be valid JSON');
      return undefined;
    }
  }
  if (obj === null) return null;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    errors.push('song must be an object with title and artist');
    return undefined;
  }

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const artist = typeof obj.artist === 'string' ? obj.artist.trim() : '';
  if (!title || title.length > 120) {
    errors.push('song.title is required and must be at most 120 characters');
  }
  if (!artist || artist.length > 120) {
    errors.push('song.artist is required and must be at most 120 characters');
  }

  const provider =
    typeof obj.provider === 'string' && VALID_PROVIDERS.has(obj.provider.toLowerCase())
      ? obj.provider.toLowerCase()
      : 'custom';

  const id =
    typeof obj.id === 'string' && obj.id.trim().length <= 100
      ? obj.id.trim()
      : `${provider}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;

  const album =
    typeof obj.album === 'string' && obj.album.trim()
      ? obj.album.trim().slice(0, 120)
      : null;

  for (const urlKey of ['artworkUrl', 'previewUrl', 'externalUrl']) {
    if (!isSafeHttpUrl(obj[urlKey])) {
      errors.push(`song.${urlKey} must be a valid http(s) URL`);
    }
  }

  return {
    id,
    provider,
    title,
    artist,
    album,
    artworkUrl: obj.artworkUrl ? String(obj.artworkUrl).trim() : null,
    previewUrl: obj.previewUrl ? String(obj.previewUrl).trim() : null,
    externalUrl: obj.externalUrl ? String(obj.externalUrl).trim() : null,
  };
}
