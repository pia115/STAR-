import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderVintagePhoto } from '../lib/ninetiesFilter.js';

const MAX_PHOTOS = 4;

export default function CameraBoothPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const fallbackCanvasRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const activeStreamRef = useRef(null);

  const [orientation, setOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [colorMode, setColorMode] = useState('color');         // 'color' | 'bw'
  const [timerSeconds, setTimerSeconds] = useState(5);         // 0 | 5 | 10
  const [mirrored, setMirrored] = useState(true);
  const [flipVertical, setFlipVertical] = useState(false);
  const [rotation, setRotation] = useState(0);                 // 0 | 90 | 180 | 270
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const [countdown, setCountdown] = useState(null);
  const [flashing, setFlashing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [cameraNote, setCameraNote] = useState('');
  const [photos, setPhotos] = useState([]);

  const isFull = photos.length >= MAX_PHOTOS;

  const stopActiveStream = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
  }, []);

  const attachStreamToVideo = useCallback(async (stream) => {
    stopActiveStream();
    activeStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setCameraReady(true);
      setUsingFallback(false);
      setCameraNote('');
    }
  }, [stopActiveStream]);

  // Start laptop webcam on mount, preferring built-in FaceTime HD camera over Desk View / Continuity cameras
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUsingFallback(true);
        setCameraReady(true);
        setCameraNote('Webcam API unavailable in this browser — using booth preview lens.');
        return;
      }

      try {
        // 1. Request initial user-facing stream at standard 720p so macOS doesn't force Continuity / Desk View
        const initialStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          initialStream.getTracks().forEach((t) => t.stop());
          return;
        }

        // 2. Enumerate video inputs now that permission is granted
        const allDevices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        const cams = allDevices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(cams);

        const activeTrack = initialStream.getVideoTracks()[0];
        const activeLabel = activeTrack?.label || '';
        const activeSettingsId = activeTrack?.getSettings?.()?.deviceId || '';

        // Check if macOS picked a Desk View / Continuity / virtual camera while a built-in FaceTime camera exists
        const builtInCam = cams.find(
          (c) =>
            /facetime|built-in|internal/i.test(c.label) &&
            !/desk view|virtual/i.test(c.label),
        );
        const isCurrentAwkward = /desk view|continuity|obs|virtual/i.test(activeLabel);

        if (builtInCam && (isCurrentAwkward || (builtInCam.deviceId && builtInCam.deviceId !== activeSettingsId && /continuity/i.test(activeLabel)))) {
          try {
            const preferredStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: builtInCam.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
            initialStream.getTracks().forEach((t) => t.stop());
            if (cancelled) {
              preferredStream.getTracks().forEach((t) => t.stop());
              return;
            }
            setSelectedDeviceId(builtInCam.deviceId);
            await attachStreamToVideo(preferredStream);
            return;
          } catch {
            // Fall back to initialStream if switching fails
          }
        }

        setSelectedDeviceId(activeSettingsId || cams[0]?.deviceId || '');
        await attachStreamToVideo(initialStream);
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
      stopActiveStream();
    };
  }, [attachStreamToVideo, stopActiveStream]);

  // Switch camera when user selects a different video input device
  const handleDeviceChange = async (e) => {
    const nextDeviceId = e.target.value;
    setSelectedDeviceId(nextDeviceId);
    if (!nextDeviceId || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: nextDeviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      await attachStreamToVideo(nextStream);
    } catch {
      setCameraNote('Could not switch to that camera.');
    }
  };

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
        flipVertical,
        rotation,
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
  }, [usingFallback, orientation, colorMode, mirrored, flipVertical, rotation]);

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

  // Build live CSS transform so rotation, horizontal mirror, and vertical flip match the output canvas
  const isSideways = rotation === 90 || rotation === 270;
  const videoTransform = [
    `rotate(${rotation}deg)`,
    `scale(${(mirrored ? -1 : 1) * (isSideways ? 1.35 : 1)}, ${(flipVertical ? -1 : 1) * (isSideways ? 1.35 : 1)})`,
  ].join(' ');

  return (
    <main className="camera-page">
      {/* Top Bar */}
      <header className="camera-topbar">
        <button type="button" className="back-pill" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="camera-title">
          hey beautiful{' '}
          <span className="camera-title__heart" aria-hidden="true">
            ♡
          </span>
        </h1>
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
            style={{ transform: videoTransform }}
            className={`camera-video ${usingFallback ? 'camera-video--hidden' : ''}`}
          />
          <canvas
            ref={fallbackCanvasRef}
            width={960}
            height={720}
            style={{ transform: videoTransform }}
            className={`camera-video ${usingFallback ? '' : 'camera-video--hidden'}`}
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

          {/* Orientation fixers: Mirror horizontal, Flip vertical, Rotate 90° */}
          <div className="camera-fix-btns" role="group" aria-label="Camera alignment controls">
            <button
              type="button"
              className={`round-icon-btn ${mirrored ? 'round-icon-btn--active' : ''}`}
              onClick={() => setMirrored((m) => !m)}
              title="Mirror left/right"
              aria-label="Mirror left/right"
            >
              ⇄
            </button>
            <button
              type="button"
              className={`round-icon-btn ${flipVertical ? 'round-icon-btn--active' : ''}`}
              onClick={() => setFlipVertical((f) => !f)}
              title="Flip upside-down camera"
              aria-label="Flip upside-down camera"
            >
              ⇅
            </button>
            <button
              type="button"
              className={`round-icon-btn ${rotation !== 0 ? 'round-icon-btn--active' : ''}`}
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Rotate camera 90°"
              aria-label="Rotate camera 90 degrees"
            >
              ↻
            </button>
          </div>

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

          {/* Camera device switcher if laptop has multiple cameras (e.g. FaceTime vs iPhone Continuity) */}
          {videoDevices.length > 1 && (
            <div className="control-group" role="group" aria-label="Select camera">
              <span className="control-group__label">CAMERA</span>
              <select
                className="camera-device-select"
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                aria-label="Choose camera lens"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
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
