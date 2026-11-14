/**
 * Renders a video frame (or image) onto a canvas with an authentic 90s
 * analog photobooth look ("bw" = warm silver-gelatin sepia/B&W like classic
 * curtain photobooths; "color" = warm 90s flash disposable film).
 */
export function renderNinetiesPhoto({
  source,
  sourceWidth,
  sourceHeight,
  orientation = 'landscape', // 'landscape' | 'portrait'
  colorMode = 'bw',          // 'bw' | 'color'
  mirrored = true,
}) {
  const targetWidth = orientation === 'portrait' ? 720 : 960;
  const targetHeight = orientation === 'portrait' ? 960 : 720;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  // 1. Center-crop source to target aspect ratio
  const targetAspect = targetWidth / targetHeight;
  const srcAspect = sourceWidth / sourceHeight;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (srcAspect > targetAspect) {
    sw = sourceHeight * targetAspect;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetAspect;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.save();
  if (mirrored) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  // 2. Soft halation / flash bloom pass (gives that dreamy 90s lens glow)
  const bloomCanvas = document.createElement('canvas');
  bloomCanvas.width = Math.round(targetWidth / 4);
  bloomCanvas.height = Math.round(targetHeight / 4);
  const bctx = bloomCanvas.getContext('2d');
  bctx.filter = 'blur(6px) contrast(130%)';
  bctx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(bloomCanvas, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  // 3. Per-pixel 90s tone curve, warm silver-gelatin B&W or 90s flash colour, + film grain
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  const cx = targetWidth * 0.5;
  const cy = targetHeight * 0.46;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < targetHeight; y++) {
    const dy = (y - cy) / maxDist;
    // Subtle horizontal analog paper texture line
    const scanline = (y % 3 === 0 ? 2 : 0);

    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      let r = d[idx];
      let g = d[idx + 1];
      let b = d[idx + 2];

      // Distance from center for direct booth flash + dark edge vignette
      const dx = (x - cx) / maxDist;
      const distSq = dx * dx + dy * dy;
      const flashBoost = Math.max(0, 1 - distSq * 1.45) * 22;
      const vignette = Math.max(0.28, 1 - Math.pow(distSq, 0.92) * 0.68);

      r = Math.min(255, r + flashBoost);
      g = Math.min(255, g + flashBoost * 0.94);
      b = Math.min(255, b + flashBoost * 0.85);

      if (colorMode === 'bw') {
        // Warm panchromatic luminance
        let lum = (0.32 * r + 0.56 * g + 0.12 * b) / 255;

        // Punchy 90s photobooth S-curve contrast with lifted darkroom blacks
        lum = 1 / (1 + Math.exp(-6.2 * (lum - 0.47)));
        lum = Math.min(1, Math.max(0, lum * vignette));

        // Map to warm 90s sepia-cream tone (deep espresso-charcoal shadows -> creamy ivory highlights)
        const shadowR = 24, shadowG = 18, shadowB = 13;
        const midR = 148, midG = 128, midB = 102;
        const highR = 247, highG = 238, highB = 216;

        if (lum < 0.5) {
          const t = lum * 2;
          r = shadowR + (midR - shadowR) * t;
          g = shadowG + (midG - shadowG) * t;
          b = shadowB + (midB - shadowB) * t;
        } else {
          const t = (lum - 0.5) * 2;
          r = midR + (highR - midR) * t;
          g = midG + (highG - midG) * t;
          b = midB + (highB - midB) * t;
        }
      } else {
        // 90s Colour: warm Kodak-flash tones, slightly muted blues, warm rose/amber highlights
        const sCurve = (v) => {
          const n = v / 255;
          return 255 / (1 + Math.exp(-5.2 * (n - 0.48)));
        };
        r = sCurve(r);
        g = sCurve(g);
        b = sCurve(b);

        // Warm analog color matrix + lifted dusty-brown shadows
        const nr = Math.min(255, r * 1.08 + g * 0.05 + 14);
        const ng = Math.min(255, r * 0.04 + g * 0.96 + 6);
        const nb = Math.min(255, b * 0.82 + r * 0.04 + 10);

        r = nr * vignette + 18 * (1 - vignette);
        g = ng * vignette + 11 * (1 - vignette);
        b = nb * vignette + 10 * (1 - vignette);
      }

      // Organic 90s film grain
      const grain = (Math.random() - 0.5) * 26 + scanline;
      d[idx] = Math.max(0, Math.min(255, r + grain));
      d[idx + 1] = Math.max(0, Math.min(255, g + grain * 0.92));
      d[idx + 2] = Math.max(0, Math.min(255, b + grain * 0.84));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 4. Subtle worn darkroom inner border
  ctx.save();
  ctx.strokeStyle = 'rgba(26, 18, 13, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, targetWidth - 6, targetHeight - 6);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}
