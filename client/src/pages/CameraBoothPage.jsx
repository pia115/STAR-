import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderVintagePhoto } from '../lib/ninetiesFilter.js';

const MAX_PHOTOS = 4;

export default function CameraBoothPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fallbackCanvasRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [colorMode, setColorMode] = useState('color');         // 'color' | 'bw'
  const [timerSeconds, setTimerSeconds] = useState(5);         // 0 | 5 | 10
  const [mirrored, setMirrored] = useState(true);

  const [countdown, setCountdown] = useState(null);
  const [flashing, setFlashing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [cameraNote, setCameraNote] = useState('');
  const [photos, setPhotos] = useState([]);

  const isFull = photos.length >= MAX_PHOTOS;

  // Start laptop webcam on mount
  useEffect(() => {
    let activeStream = null;
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUsingFallback(true);
        setCameraReady(true);
        setCameraNote('Webcam API unavailable in this browser — using booth preview lens.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
          setUsingFallback(false);
          setCameraNote('');
        }
      } catch {
        if (!cancelled) {
          setUsingFallback(true);
          setCameraReady(true);
          setCameraNote('Camera permission not granted yet — using vintage booth stand-in lens.');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Draw an animated vintage photobooth curtain + subject if no physical webcam is connected
  useEffect(() => {
    if (!usingFallback) return;
    let rafId;
    const canvas = fallbackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = (time) => {
      const w = canvas.width;
      const h = canvas.height;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#c8b294');
      grad.addColorStop(1, '#8c7258');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let x = 0; x < w; x += 36) {
        ctx.fillStyle = x % 72 === 0 ? 'rgba(45, 30, 18, 0.16)' : 'rgba(255, 245, 225, 0.12)';
        ctx.fillRect(x, 0, 22, h);
      }

      const sway = Math.sin(time * 0.002) * 8;
      const cx = w / 2 + sway;
      const cy = h * 0.56;

      const flash = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy - 40, w * 0.48);
      flash.addColorStop(0, 'rgba(255, 244, 222, 0.45)');
      flash.addColorStop(1, 'rgba(20, 12, 8, 0.35)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#f2e8d5';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.92, 165, 130, 0, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#251812';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 96, 125, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dfae8c';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 18, 64, 78, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#251812';
      ctx.beginPath();
      ctx.arc(cx - 28, cy - 68, 46, 0.1 * Math.PI, 0.95 * Math.PI);
      ctx.arc(cx + 28, cy - 68, 46, 0.05 * Math.PI, 0.9 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#231612';
      ctx.beginPath();
      ctx.ellipse(cx - 22, cy - 22, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, cy - 22, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#8f4642';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, 16, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [usingFallback]);

  const snapNow = useCallback(() => {
    setPhotos((prev) => {
      if (prev.length >= MAX_PHOTOS) return prev;
      const source = usingFallback ? fallbackCanvasRef.current : videoRef.current;
      if (!source) return prev;

      const sourceWidth = usingFallback ? source.width : source.videoWidth || 1280;
      const sourceHeight = usingFallback ? source.height : source.videoHeight || 720;

      setFlashing(true);
      setTimeout(() => setFlashing(false), 260);

      const dataUrl = renderVintagePhoto({
        source,
        sourceWidth,
        sourceHeight,
        orientation,
        colorMode,
        mirrored,
      });

      return [
        ...prev,
        {
          id: `${Date.now()}-${prev.length + 1}`,
          dataUrl,
          orientation,
          colorMode,
          shotNumber: prev.length + 1,
        },
      ];
    });
  }, [usingFallback, orientation, colorMode, mirrored]);

  const handleClicker = () => {
    if (countdown !== null || isFull) return;

    if (timerSeconds === 0) {
      snapNow();
      return;
    }

    let remaining = timerSeconds;
    setCountdown(remaining);

    timerIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        setCountdown(null);
        snapNow();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const removePhoto = (id) => {
    setPhotos((prev) =>
      prev
        .filter((p) => p.id !== id)
        .map((p, idx) => ({ ...p, shotNumber: idx + 1 })),
    );
  };

  // Download a vertical photo strip combining up to 4 shots
  const downloadStrip = () => {
    if (photos.length === 0) return;
    const slice = photos.slice(0, MAX_PHOTOS);
    const frameW = 480;
    const frameH = slice[0].orientation === 'portrait' ? 640 : 360;
    const pad = 28;
    const bottomPad = 68;
    const canvas = document.createElement('canvas');
    canvas.width = frameW + pad * 2;
    canvas.height = slice.length * (frameH + pad) + pad + bottomPad;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f3ead8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loaded = 0;
    slice.forEach((p, idx) => {
      const img = new Image();
      img.onload = () => {
        const y = pad + idx * (frameH + pad);
        ctx.drawImage(img, pad, y, frameW, frameH);
        loaded += 1;
        if (loaded === slice.length) {
          ctx.fillStyle = '#3c2a1e';
          ctx.font = 'italic 26px "Caveat", cursive';
          ctx.textAlign = 'center';
          ctx.fillText(
            new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
            canvas.width / 2,
            canvas.height - 26,
          );
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/jpeg', 0.94);
          a.download = `booth-strip-${Date.now()}.jpg`;
          a.click();
        }
      };
      img.src = p.dataUrl;
    });
  };

  const badgeValue =
    countdown !== null ? countdown : `${Math.min(photos.length + (isFull ? 0 : 1), MAX_PHOTOS)}/${MAX_PHOTOS}`;

  return (
    <main className="camera-page">
      {/* Top Bar */}
      <header className="camera-topbar">
        <button type="button" className="back-pill" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="camera-title">hey beautiful</h1>
        <div className="camera-topbar__spacer" />
      </header>

      {/* Large spread-out vintage camera frame */}
      <section className="camera-stage">
        <div
          className={`camera-viewport camera-viewport--${orientation} camera-viewport--${colorMode}`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`camera-video ${mirrored ? 'camera-video--mirrored' : ''} ${
              usingFallback ? 'camera-video--hidden' : ''
            }`}
          />
          <canvas
            ref={fallbackCanvasRef}
            width={960}
            height={720}
            className={`camera-video ${mirrored ? 'camera-video--mirrored' : ''} ${
              usingFallback ? '' : 'camera-video--hidden'
            }`}
          />

          {/* Subtle optical vignette overlay */}
          <div className="camera-viewport__analog-overlay" aria-hidden="true" />

          {/* Flash overlay when photo snaps */}
          {flashing && <div className="camera-viewport__flash" aria-hidden="true" />}

          {/* Stitched counter / countdown badge on the right side */}
          <div
            className={`camera-badge ${countdown !== null ? 'camera-badge--counting' : ''}`}
            aria-live="polite"
            title={countdown !== null ? 'Countdown' : 'Shot count (max 4)'}
          >
            {badgeValue}
          </div>
        </div>

        {isFull ? (
          <p className="camera-limit-banner" role="status">
            4 / 4 photos taken! Download your strip below, or remove a photo to take another.
          </p>
        ) : (
          cameraNote && <p className="camera-note">{cameraNote}</p>
        )}

        {/* Bottom Controls Bar */}
        <div className="camera-controls">
          {/* Orientation: Landscape or Portrait */}
          <div className="control-group" role="group" aria-label="Camera orientation">
            <span className="control-group__label">MODE</span>
            <div className="control-pills">
              <button
                type="button"
                className={`control-pill ${orientation === 'landscape' ? 'control-pill--active' : ''}`}
                onClick={() => setOrientation('landscape')}
              >
                Landscape
              </button>
              <button
                type="button"
                className={`control-pill ${orientation === 'portrait' ? 'control-pill--active' : ''}`}
                onClick={() => setOrientation('portrait')}
              >
                Portrait
              </button>
            </div>
          </div>

          {/* Filter Option: Colour or B&W */}
          <div className="control-group" role="group" aria-label="Filter style">
            <span className="control-group__label">FILTER</span>
            <div className="control-pills">
              <button
                type="button"
                className={`control-pill ${colorMode === 'color' ? 'control-pill--active' : ''}`}
                onClick={() => setColorMode('color')}
              >
                Colour
              </button>
              <button
                type="button"
                className={`control-pill ${colorMode === 'bw' ? 'control-pill--active' : ''}`}
                onClick={() => setColorMode('bw')}
              >
                B&amp;W
              </button>
            </div>
          </div>

          {/* Mirror flip button */}
          <button
            type="button"
            className="round-icon-btn"
            onClick={() => setMirrored((m) => !m)}
            title="Flip mirror"
            aria-label="Flip mirror"
          >
            ⇄
          </button>

          {/* Center Pink Clicker / Shutter Button */}
          <button
            type="button"
            className="clicker-btn"
            onClick={handleClicker}
            disabled={!cameraReady || countdown !== null || isFull}
            aria-label={isFull ? 'Maximum 4 photos reached' : 'Take photo'}
            title={isFull ? 'Max 4 photos reached' : 'Click to take photo'}
          >
            <span className="clicker-btn__inner" />
          </button>

          {/* Timer Selector: Off, 5s, 10s */}
          <div className="control-group" role="group" aria-label="Countdown timer">
            <span className="control-group__label">TIMER</span>
            <div className="control-pills">
              {[
                { label: 'Off', value: 0 },
                { label: '5s', value: 5 },
                { label: '10s', value: 10 },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`control-pill ${timerSeconds === t.value ? 'control-pill--active' : ''}`}
                  onClick={() => setTimerSeconds(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Developed Photos Output Tray */}
      {photos.length > 0 && (
        <section className="developed-tray" aria-label="Captured photos">
          <div className="developed-tray__header">
            <h2 className="developed-tray__title">
              developed prints ({photos.length} / {MAX_PHOTOS})
            </h2>
            <div className="developed-tray__actions">
              <button type="button" className="tray-btn tray-btn--primary" onClick={downloadStrip}>
                download strip
              </button>
              <button
                type="button"
                className="tray-btn"
                onClick={() => setPhotos([])}
              >
                clear photos
              </button>
            </div>
          </div>

          <div className="developed-grid">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className={`vintage-print vintage-print--${photo.orientation}`}
              >
                <img src={photo.dataUrl} alt={`Shot ${photo.shotNumber}`} />
                <figcaption className="vintage-print__footer">
                  <span>
                    #{photo.shotNumber} · {photo.colorMode === 'bw' ? 'b&w' : 'colour'} ·{' '}
                    {photo.orientation}
                  </span>
                  <div className="vintage-print__links">
                    <a
                      href={photo.dataUrl}
                      download={`booth-shot-${photo.shotNumber}.jpg`}
                      className="vintage-print__dl"
                    >
                      save jpg
                    </a>
                    <button
                      type="button"
                      className="vintage-print__remove"
                      onClick={() => removePhoto(photo.id)}
                    >
                      remove
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
