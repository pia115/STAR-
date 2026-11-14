import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderVintagePhoto } from '../lib/ninetiesFilter.js';

const MAX_PHOTOS = 4;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per photo
const ALLOWED_MIME_RE = /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i;

/**
 * Safely decodes an image File in browser memory and revokes the temporary
 * ObjectURL immediately after decoding so raw file references aren't leaked.
 */
function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not decode "${file.name}".`));
    };
    img.src = objectUrl;
  });
}

export default function UploadBoothPage({
  initialFiles = [],
  onClearInitialFiles,
  onOpenLibraryPicker,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const openPicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else if (onOpenLibraryPicker) {
      onOpenLibraryPicker();
    }
  };

  // Store clean in-memory bitmap canvases (EXIF/GPS already stripped) so we can
  // re-apply Colour / B&W and Landscape / Portrait filters instantaneously.
  const [rawSources, setRawSources] = useState([]); // [{ id, name, canvas, width, height }]
  const [processedPhotos, setProcessedPhotos] = useState([]); // [{ id, name, dataUrl, shotNumber }]
  const [orientation, setOrientation] = useState('portrait'); // 'portrait' | 'landscape'
  const [colorMode, setColorMode] = useState('bw');           // 'bw' | 'color'
  const [overLimitNotice, setOverLimitNotice] = useState('');
  const [errorNotice, setErrorNotice] = useState('');
  const [processing, setProcessing] = useState(false);

  const ingestFiles = useCallback(async (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    setErrorNotice('');
    setProcessing(true);

    try {
      const validFiles = [];
      for (const file of incoming) {
        if (!ALLOWED_MIME_RE.test(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
          setErrorNotice(`Skipped "${file.name}" — only image files (JPG, PNG, WEBP, HEIC) are allowed.`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setErrorNotice(`Skipped "${file.name}" — each photo must be under 15 MB.`);
          continue;
        }
        validFiles.push(file);
      }

      const decoded = [];
      for (const file of validFiles) {
        try {
          const img = await loadImageElement(file);
          // Copy only raw pixel data to an offscreen canvas (strips all EXIF/GPS metadata)
          const off = document.createElement('canvas');
          off.width = img.naturalWidth || img.width;
          off.height = img.naturalHeight || img.height;
          const octx = off.getContext('2d');
          octx.drawImage(img, 0, 0);
          decoded.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            canvas: off,
            width: off.width,
            height: off.height,
          });
        } catch (err) {
          setErrorNotice(err.message);
        }
      }

      setRawSources((prev) => {
        const combined = [...prev, ...decoded];
        if (combined.length > MAX_PHOTOS) {
          setOverLimitNotice(
            `You can only upload ${MAX_PHOTOS} pictures at a time — keeping your first ${MAX_PHOTOS} photos.`,
          );
          return combined.slice(0, MAX_PHOTOS);
        }
        return combined;
      });
    } finally {
      setProcessing(false);
    }
  }, []);

  // Process any files selected from the front page picker on mount
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      if (initialFiles.length > MAX_PHOTOS) {
        setOverLimitNotice(
          `You can only upload ${MAX_PHOTOS} pictures at a time — keeping your first ${MAX_PHOTOS} photos.`,
        );
      }
      ingestFiles(initialFiles);
      if (onClearInitialFiles) onClearInitialFiles();
    }
  }, [initialFiles, ingestFiles, onClearInitialFiles]);

  // Re-apply the exact same vintage filter whenever rawSources, colorMode, or orientation changes
  useEffect(() => {
    const next = rawSources.map((item, idx) => ({
      id: item.id,
      name: item.name,
      shotNumber: idx + 1,
      orientation,
      colorMode,
      dataUrl: renderVintagePhoto({
        source: item.canvas,
        sourceWidth: item.width,
        sourceHeight: item.height,
        orientation,
        colorMode,
        mirrored: false,
      }),
    }));
    setProcessedPhotos(next);
  }, [rawSources, orientation, colorMode]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (rawSources.length + files.length > MAX_PHOTOS) {
      setOverLimitNotice(
        `You can only upload ${MAX_PHOTOS} pictures at a time — keeping your first ${MAX_PHOTOS} photos.`,
      );
    } else {
      setOverLimitNotice('');
    }
    ingestFiles(files);
    e.target.value = '';
  };

  const removePhoto = (id) => {
    setOverLimitNotice('');
    setRawSources((prev) => prev.filter((item) => item.id !== id));
  };

  const downloadStrip = () => {
    if (processedPhotos.length === 0) return;
    const slice = processedPhotos.slice(0, MAX_PHOTOS);
    const frameW = 480;
    const frameH = orientation === 'portrait' ? 640 : 360;
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

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <main className="camera-page upload-page">
      {/* Top Bar */}
      <header className="camera-topbar">
        <button type="button" className="back-pill" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 className="camera-title">Upload Your Photos</h1>
      </header>

      {/* 4-photo limit info */}
      <p className="upload-privacy-note">
        4 photos at a time maximum
      </p>

      {/* Disclaimer alert when user tries to upload more than 4 photos */}
      {overLimitNotice && (
        <div className="upload-disclaimer-alert" role="alert">
          <span>{overLimitNotice}</span>
          <button
            type="button"
            className="upload-disclaimer-alert__close"
            onClick={() => setOverLimitNotice('')}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="upload-disclaimer-alert upload-disclaimer-alert--error" role="alert">
          <span>{errorNotice}</span>
          <button
            type="button"
            className="upload-disclaimer-alert__close"
            onClick={() => setErrorNotice('')}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter & Orientation Controls */}
      <div className="camera-controls upload-controls">
        <div className="control-group" role="group" aria-label="Photo orientation">
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

        <button
          type="button"
          className="tray-btn tray-btn--primary"
          disabled={rawSources.length >= MAX_PHOTOS || processing}
          onClick={openPicker}
        >
          {rawSources.length === 0
            ? 'choose from photo library'
            : rawSources.length >= MAX_PHOTOS
              ? '4 / 4 photos selected'
              : `+ add photos (${rawSources.length}/${MAX_PHOTOS})`}
        </button>

        {rawSources.length > 0 && (
          <button
            type="button"
            className="tray-btn"
            onClick={() => {
              setRawSources([]);
              setOverLimitNotice('');
            }}
          >
            clear all
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
          multiple
          className="sr-only-input"
          onChange={handleFileChange}
        />
      </div>

      {/* Empty state library picker card */}
      {processedPhotos.length === 0 ? (
        <div
          className="upload-dropcard"
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openPicker();
          }}
        >
          <p className="upload-dropcard__title">choose up to 4 photos from your phone or laptop library</p>
          <p className="upload-dropcard__sub">
            JPG, PNG, WEBP or HEIC · your selected filters (Colour or B&amp;W) will be applied to your strip automatically
          </p>
          <span className="booth-option-btn upload-dropcard__btn">browse photo library</span>
        </div>
      ) : (
        <div className="upload-workspace">
          {/* Selected Photos Row (like user's Upload Your Photos reference) */}
          <section className="upload-slots-section" aria-label="Selected photos">
            <div className="upload-slots-grid">
              {processedPhotos.map((photo) => (
                <figure key={photo.id} className="upload-slot-card">
                  <img src={photo.dataUrl} alt={`Uploaded shot ${photo.shotNumber}`} />
                  <div className="upload-slot-card__bar">
                    <span>#{photo.shotNumber}</span>
                    <button
                      type="button"
                      className="vintage-print__remove"
                      onClick={() => removePhoto(photo.id)}
                    >
                      remove
                    </button>
                  </div>
                </figure>
              ))}
            </div>
          </section>

          {/* Live Vintage Photo Strip Preview (like user's Photo is printing / Collect Photo reference) */}
          <section className="strip-preview-section" aria-label="Photo strip preview">
            <p className="strip-preview__status">
              <span className="strip-preview__dot" /> Photo strip ready ({processedPhotos.length} {processedPhotos.length === 1 ? 'photo' : 'photos'})
            </p>

            <div className="strip-preview-card">
              <div className="strip-preview-inner">
                {processedPhotos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.dataUrl}
                    alt={`Strip frame ${photo.shotNumber}`}
                    className="strip-preview-frame"
                  />
                ))}
                <p className="strip-preview-date">{todayFormatted}</p>
              </div>
            </div>

            <button
              type="button"
              className="collect-photo-btn"
              onClick={downloadStrip}
            >
              Collect Photo Strip
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
