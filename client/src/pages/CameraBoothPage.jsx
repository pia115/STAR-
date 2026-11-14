import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderNinetiesPhoto } from '../lib/ninetiesFilter.js';

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
      // 90s booth curtain pleats in the background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#c8b294');
      grad.addColorStop(1, '#8c7258');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (let x = 0; x < w; x += 36) {
        ctx.fillStyle = x % 72 === 0 ? 'rgba(45, 30, 18, 0.16)' : 'rgba(255, 245, 225, 0.12)';
        ctx.fillRect(x, 0, 22, h);
      }

      // Gentle sway for the booth pose silhouette
      const sway = Math.sin(time * 0.002) * 8;
      const cx = w / 2 + sway;
      const cy = h * 0.56;

      // Soft flash glow behind subject
      const flash = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy - 40, w * 0.48);
      flash.addColorStop(0, 'rgba(255, 244, 222, 0.45)');
      flash.addColorStop(1, 'rgba(20, 12, 8, 0.35)');
      ctx.fillStyle = flash;
      ctx.fillRect(0, 0, w, h);

      // Shoulders / top
      ctx.fillStyle = '#f2e8d5';
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.92, 165, 130, 0, Math.PI, 0);
      ctx.fill();

      // Hair back
      ctx.fillStyle = '#251812';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10, 96, 125, 0, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = '#dfae8c';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 18, 64, 78, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curtain bangs
      ctx.fillStyle = '#251812';
      ctx.beginPath();
      ctx.arc(cx - 28, cy - 68, 46, 0.1 * Math.PI, 0.95 * Math.PI);
      ctx.arc(cx + 28, cy - 68, 46, 0.05 * Math.PI, 0.9 * Math.PI);
      ctx.fill();

      // Eyes & 90s lip
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
    const source = usingFallback ? fallbackCanvasRef.current : videoRef.current;
    if (!source) return;

    const sourceWidth = usingFallback ? source.width : source.videoWidth || 1280;
    const sourceHeight = usingFallback ? source.height : source.videoHeight || 720;

    setFlashing(true);
    setTimeout(() => setFlashing(false), 260);

    const dataUrl = renderNinetiesPhoto({
      source,
      sourceWidth,
      sourceHeight,
      orientation,
      colorMode,
      mirrored,
    });

    setPhotos((prev) => [
      {
        id: `${Date.now()}-${prev.length + 1}`,
        dataUrl,
        orientation,
        colorMode,
        shotNumber: prev.length + 1,
      },
      ...prev,
    ]);
  }, [usingFallback, orientation, colorMode, mirrored]);

  const handleClicker = () => {
    if (countdown !== null) return;

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

  // Download a 90s vertical photo strip combining up to 4 recent shots
  const downloadStrip = () => {
    if (photos.length === 0) return;
    const slice = photos.slice(0, 4).reverse();
    const firstImg = new Image();
    firstImg.src = slice[0].dataUrl;
    firstImg.onload = () => {
      const frameW = 480;
      const frameH = slice[0].orientation === 'portrait' ? 640 : 360;
      const pad = 28;
      const bottomPad = 68;
      const canvas = document.createElement('canvas');
      canvas.width = frameW + pad * 2;
      canvas.height = slice.length * (frameH + pad) + pad + bottomPad;
      const ctx = canvas.getContext('2d');

      // Aged 90s cream photobooth paper border
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
            a.download = `booth-90s-strip-${Date.now()}.jpg`;
            a.click();
          }
        };
        img.src = p.dataUrl;
      });
    };
  };

  const badgeValue = countdown !== null ? countdown : photos.length + 1;

  return (
    <main className="camera-page">
      {/* Top Bar matching reference screenshot */}
      <header className="camera-topbar">
        <button type="button" className="back-pill" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="camera-title">Strike a Pose</h1>
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

          {/* 90s analog warm lens vignette + subtle film grain overlay */}
          <div className="camera-viewport__analog-overlay" aria-hidden="true" />

          {/* Flash overlay when photo snaps */}
          {flashing && <div className="camera-viewport__flash" aria-hidden="true" />}

          {/* Stitched pink counter / countdown badge on the right side (like reference) */}
          <div
            className={`camera-badge ${countdown !== null ? 'camera-badge--counting' : ''}`}
            aria-live="polite"
            title={countdown !== null ? 'Countdown' : 'Shot number'}
          >
            {badgeValue}
          </div>
        </div>

        {cameraNote && <p className="camera-note">{cameraNote}</p>}

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

          {/* 90s Film Option: Colour or B&W */}
          <div className="control-group" role="group" aria-label="90s film style">
            <span className="control-group__label">90s FILM</span>
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
            disabled={!cameraReady || countdown !== null}
            aria-label="Take photo"
            title="Click to take photo"
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

      {/* 90s Developed Photos Output Tray */}
      {photos.length > 0 && (
        <section className="developed-tray" aria-label="Captured 90s photos">
          <div className="developed-tray__header">
            <h2 className="developed-tray__title">
              developed 90s prints ({photos.length})
            </h2>
            <div className="developed-tray__actions">
              <button type="button" className="tray-btn tray-btn--primary" onClick={downloadStrip}>
                download 90s strip
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
                className={`nineties-print nineties-print--${photo.orientation}`}
              >
                <img src={photo.dataUrl} alt={`90s shot ${photo.shotNumber}`} />
                <figcaption className="nineties-print__footer">
                  <span>
                    #{photo.shotNumber} · 90s {photo.colorMode === 'bw' ? 'B&W' : 'Colour'} ·{' '}
                    {photo.orientation}
                  </span>
                  <a
                    href={photo.dataUrl}
                    download={`booth-90s-shot-${photo.shotNumber}.jpg`}
                    className="nineties-print__dl"
                  >
                    save jpg
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
