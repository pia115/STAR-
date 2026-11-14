/**
 * Renders a video frame (or image) onto a canvas with a vintage photobooth look:
 * - "bw": High-contrast, rich warm silver-gelatin B&W (deep velvety blacks,
 *         luminous creamy skin highlights, smooth tones with very fine film texture).
 * - "color": Cute vintage digicam / warm film look (clear, flattering skin tones,
 *            crisp contrast, subtle warm golden cast, and gentle corner vignette).
 */
export function renderVintagePhoto({
  source,
  sourceWidth,
  sourceHeight,
  orientation = 'landscape', // 'landscape' | 'portrait'
  colorMode = 'bw',          // 'bw' | 'color'
  mirrored = true,
  flipVertical = false,
  rotation = 0,              // 0 | 90 | 180 | 270
}) {
  const targetWidth = orientation === 'portrait' ? 720 : 960;
  const targetHeight = orientation === 'portrait' ? 960 : 720;

  // Step 0: Normalize source orientation onto an upright intermediate canvas
  const rot = ((rotation % 360) + 360) % 360;
  const isSideways = rot === 90 || rot === 270;
  const normW = isSideways ? sourceHeight : sourceWidth;
  const normH = isSideways ? sourceWidth : sourceHeight;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = normW;
  normCanvas.height = normH;
  const nctx = normCanvas.getContext('2d');

  nctx.save();
  nctx.translate(normW / 2, normH / 2);
  if (rot !== 0) {
    nctx.rotate((rot * Math.PI) / 180);
  }
  const scaleX = mirrored ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  nctx.scale(scaleX, scaleY);
  nctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  nctx.restore();

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  // 1. Center-crop normalized source to target aspect ratio
  const targetAspect = targetWidth / targetHeight;
  const srcAspect = normW / normH;
  let sx = 0;
  let sy = 0;
  let sw = normW;
  let sh = normH;

  if (srcAspect > targetAspect) {
    sw = normH * targetAspect;
    sx = (normW - sw) / 2;
  } else {
    sh = normW / targetAspect;
    sy = (normH - sh) / 2;
  }

  ctx.drawImage(normCanvas, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  // 2. Subtle highlight glow (very light so faces stay sharp and clear)
  const bloomCanvas = document.createElement('canvas');
  bloomCanvas.width = Math.round(targetWidth / 3);
  bloomCanvas.height = Math.round(targetHeight / 3);
  const bctx = bloomCanvas.getContext('2d');
  bctx.filter = 'blur(5px) contrast(125%)';
  bctx.drawImage(canvas, 0, 0, bloomCanvas.width, bloomCanvas.height);

  ctx.save();
  ctx.globalAlpha = colorMode === 'bw' ? 0.12 : 0.08;
  ctx.globalCompositeOperation = 'soft-light';
  ctx.drawImage(bloomCanvas, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  // 3. Per-pixel tone curve & color grading
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const d = imgData.data;

  const cx = targetWidth * 0.5;
  const cy = targetHeight * 0.48;
  const maxDist = Math.hypot(cx, cy);

  for (let y = 0; y < targetHeight; y++) {
    const dy = (y - cy) / maxDist;

    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      let r = d[idx];
      let g = d[idx + 1];
      let b = d[idx + 2];

      const dx = (x - cx) / maxDist;
      const distSq = dx * dx + dy * dy;

      if (colorMode === 'bw') {
        const vignette = Math.max(0.38, 1 - Math.pow(distSq, 1.05) * 0.56);
        let lum = (0.34 * r + 0.54 * g + 0.12 * b) / 255;

        lum = 1 / (1 + Math.exp(-7.8 * (lum - 0.46)));
        lum = Math.min(1, Math.max(0, lum * vignette));

        const shadowR = 12, shadowG = 10, shadowB = 8;
        const midR = 138, midG = 122, midB = 103;
        const highR = 250, highG = 244, highB = 230;

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

        const grain = (Math.random() - 0.5) * 5.5;
        d[idx] = Math.max(0, Math.min(255, r + grain));
        d[idx + 1] = Math.max(0, Math.min(255, g + grain * 0.95));
        d[idx + 2] = Math.max(0, Math.min(255, b + grain * 0.9));
      } else {
        const vignette = Math.max(0.68, 1 - Math.pow(distSq, 1.15) * 0.32);

        const contrastCurve = (v) => {
          const n = v / 255;
          const c = 1 / (1 + Math.exp(-4.6 * (n - 0.49)));
          const minC = 1 / (1 + Math.exp(4.6 * 0.49));
          const maxC = 1 / (1 + Math.exp(-4.6 * 0.51));
          return ((c - minC) / (maxC - minC)) * 255;
        };

        r = contrastCurve(r);
        g = contrastCurve(g);
        b = contrastCurve(b);

        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        r = avg + (r - avg) * 1.08 + 6;
        g = avg + (g - avg) * 1.04 + 2;
        b = avg + (b - avg) * 0.94 - 3;

        r *= vignette;
        g *= vignette;
        b *= vignette;

        const grain = (Math.random() - 0.5) * 3.5;
        d[idx] = Math.max(0, Math.min(255, r + grain));
        d[idx + 1] = Math.max(0, Math.min(255, g + grain));
        d[idx + 2] = Math.max(0, Math.min(255, b + grain));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.94);
}
