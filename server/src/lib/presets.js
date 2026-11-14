export const FILTERS = [
  { id: 'none', name: 'Original', description: 'Natural unprocessed lens' },
  { id: 'bw', name: 'Black & White', description: 'High-contrast silver gelatin print' },
  { id: 'kodak-warm', name: 'Kodak Warm', description: 'Golden-hour warmth and soft highlights' },
  { id: 'sepia', name: 'Vintage Sepia', description: 'Antique brown-toned darkroom print' },
  { id: 'faded-film', name: 'Faded Film', description: 'Lifted shadows and muted matte tones' },
  { id: 'flash', name: '90s Flash', description: 'Direct booth flash with punchy contrast and vignette' },
  { id: 'disposable-grain', name: 'Disposable Camera', description: 'Warm green-gold tint with heavy 35mm grain' },
];

export const LAYOUTS = [
  { id: 'classic-3', name: 'Classic 3-Shot Strip', frameCount: 3, columns: 1 },
  { id: 'classic-4', name: 'Classic 4-Shot Strip', frameCount: 4, columns: 1 },
  { id: 'grid-4', name: '2×2 Postcard Grid', frameCount: 4, columns: 2 },
];

export const BORDERS = [
  { id: 'classic', name: 'Classic Cream' },
  { id: 'film', name: '35mm Film Border' },
  { id: 'scalloped', name: 'Scalloped Stamp' },
  { id: 'polaroid', name: 'Instant Polaroid' },
  { id: 'floral', name: 'Pressed Flowers' },
  { id: 'stitched', name: 'Stitched Ticket' },
];

export const BACKGROUNDS = [
  { id: 'warm-cream', name: 'Warm Cream', hex: '#f7efe2' },
  { id: 'dusty-rose', name: 'Dusty Rose', hex: '#e8c5c9' },
  { id: 'butter-yellow', name: 'Butter Yellow', hex: '#f6e29c' },
  { id: 'burgundy', name: 'Burgundy Velvet', hex: '#4d1f28' },
  { id: 'espresso', name: 'Darkroom Espresso', hex: '#2b1619' },
  { id: 'soft-sage', name: 'Pressed Sage', hex: '#d4ddd0' },
];

export const STICKERS = [
  { id: 'star-gold', type: 'sticker', label: 'Gold Star', glyph: '✦', defaultColor: '#d9b443' },
  { id: 'sparkle', type: 'sticker', label: 'Sparkle', glyph: '✧', defaultColor: '#c97d87' },
  { id: 'flower-rose', type: 'sticker', label: 'Blossom', glyph: '✿', defaultColor: '#c97d87' },
  { id: 'flower-cream', type: 'sticker', label: 'Daisy', glyph: '❀', defaultColor: '#4d1f28' },
  { id: 'heart-filled', type: 'sticker', label: 'Heart', glyph: '♥', defaultColor: '#a85c67' },
  { id: 'heart-outline', type: 'sticker', label: 'Sweet Heart', glyph: '♡', defaultColor: '#4d1f28' },
  { id: 'kiss', type: 'sticker', label: 'XOXO', glyph: 'xoxo', defaultColor: '#a85c67' },
  { id: 'vinyl', type: 'sticker', label: 'Vinyl Record', glyph: '♪', defaultColor: '#2b1619' },
];
