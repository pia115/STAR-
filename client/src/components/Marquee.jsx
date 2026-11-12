import { BRAND } from '../brand.js';

/** The lit-up sign on top of the booth, with little bulbs around it. */
export default function Marquee({ small = false }) {
  const bulbs = Array.from({ length: small ? 10 : 14 });
  return (
    <div className={`marquee ${small ? 'marquee--small' : ''}`}>
      <div className="marquee__bulbs" aria-hidden="true">
        {bulbs.map((_, i) => <span key={i} className="bulb" style={{ animationDelay: `${(i % 4) * 0.25}s` }} />)}
      </div>
      <h1 className="marquee__title">{BRAND.name}</h1>
      <p className="marquee__sub">✦ photobooth ✦ est. 2026 ✦</p>
    </div>
  );
}
