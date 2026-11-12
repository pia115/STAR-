import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { BRAND } from '../brand.js';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function UploadCard({ onSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) return setPreview('');
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = () => {
    setFile(null);
    setTitle('');
    setCaption('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Pick a photo first ✿');
    setError('');
    setBusy(true);
    try {
      const form = new FormData();
      form.append('image', file);
      if (title) form.append('title', title);
      if (caption) form.append('caption', caption);
      form.append('takenAt', new Date().toISOString());
      const strip = await api('/api/strips', { method: 'POST', body: form });
      onSaved(strip);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card upload" onSubmit={onSubmit}>
      <h3 className="card__title">add a memory</h3>
      <p className="card__hint handwritten">upload a photo or strip to test your gallery</p>

      <label className={`dropzone ${preview ? 'dropzone--filled' : ''}`}>
        {preview ? <img src={preview} alt="preview" /> : <span>✦ click to choose a photo ✦<br /><small>png · jpeg · webp</small></span>}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <label className="field">
        <span>title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="saturday with mia" />
      </label>
      <label className="field">
        <span>caption</span>
        <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={280} placeholder="best day ever ♡" />
      </label>

      {error && <p className="form__error" role="alert">{error}</p>}
      <button className="btn btn--primary" disabled={busy}>{busy ? 'developing…' : 'save to gallery'}</button>
    </form>
  );
}

function StripCard({ strip, index, onDelete }) {
  const tilt = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2][index % 6];
  return (
    <figure className="polaroid" style={{ '--tilt': `${tilt}deg` }}>
      <span className="tape" aria-hidden="true" />
      <img src={strip.imageUrl} alt={strip.title || 'photo strip'} loading="lazy" />
      <figcaption>
        <strong className="handwritten">{strip.title || 'untitled memory'}</strong>
        {strip.caption && <span className="polaroid__caption">{strip.caption}</span>}
        <time className="polaroid__date">{formatDate(strip.takenAt || strip.createdAt)}</time>
      </figcaption>
      <div className="polaroid__actions">
        <a className="btn btn--tiny" href={strip.imageUrl} download={`${strip.title || 'photo-strip'}`}>download</a>
        <button className="btn btn--tiny btn--ghost" onClick={() => onDelete(strip)}>delete</button>
      </div>
    </figure>
  );
}

export default function GalleryPage() {
  const { user, logout } = useAuth();
  const [strips, setStrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/strips?limit=50')
      .then((data) => setStrips(data.strips))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onDelete = async (strip) => {
    if (!window.confirm('Delete this memory forever?')) return;
    try {
      await api(`/api/strips/${strip.id}`, { method: 'DELETE' });
      setStrips((s) => s.filter((x) => x.id !== strip.id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo">{BRAND.name}</span>
          <span className="topbar__dot">✦</span>
          <span className="handwritten topbar__hi">hi, {user.name} ♡</span>
        </div>
        <button className="btn btn--ghost" onClick={logout}>log out</button>
      </header>

      <section className="hero">
        <div className="card booth-teaser">
          <div className="booth-teaser__lens" aria-hidden="true"><span /></div>
          <div>
            <h2 className="card__title">the booth</h2>
            <p>webcam, countdown, 4 shots &amp; vintage filters — <em>coming next</em>.</p>
            <button className="btn btn--yellow" disabled>📸 take photos (soon)</button>
          </div>
        </div>
        <UploadCard onSaved={(strip) => setStrips((s) => [strip, ...s])} />
      </section>

      <section className="gallery">
        <h2 className="section-title">
          <span>✿</span> memory gallery <span>✿</span>
        </h2>
        {error && <p className="form__error" role="alert">{error}</p>}
        {loading ? (
          <p className="empty handwritten">developing your photos…</p>
        ) : strips.length === 0 ? (
          <p className="empty handwritten">no memories yet — add your first one above ✦</p>
        ) : (
          <div className="grid">
            {strips.map((s, i) => <StripCard key={s.id} strip={s} index={i} onDelete={onDelete} />)}
          </div>
        )}
      </section>

      <footer className="footer handwritten">made with ♡ and a little film grain</footer>
    </div>
  );
}
