import { useState } from 'react';
import { CameraGraphic, SketchFlower, SparkleStar } from '../components/BoothGraphics.jsx';

export default function LandingPage() {
  const [selectedAction, setSelectedAction] = useState(null);

  return (
    <main className="landing">
      {/* Background flower graphics from the sketch + cute graphic stars */}
      <SketchFlower className="bg-flower bg-flower--top-right" />
      <SketchFlower className="bg-flower bg-flower--bottom-left" />
      <SketchFlower className="bg-flower bg-flower--top-left-mini" />
      <SketchFlower className="bg-flower bg-flower--bottom-right-mini" />

      <SparkleStar className="bg-star" style={{ top: '12%', left: '42%', width: '34px' }} />
      <SparkleStar className="bg-star bg-star--pink" style={{ top: '22%', left: '12%', width: '26px' }} />
      <SparkleStar className="bg-star" style={{ bottom: '16%', left: '48%', width: '30px' }} />
      <SparkleStar className="bg-star bg-star--pink" style={{ top: '74%', right: '38%', width: '22px' }} />
      <SparkleStar className="bg-star" style={{ top: '15%', right: '30%', width: '24px' }} />

      <div className="landing__content">
        {/* Left side: Vertical B - [Camera as OO] - T - H */}
        <section className="booth-logo" aria-label="BOOTH">
          <span className="booth-logo__letter" aria-hidden="true">B</span>
          <div className="booth-logo__camera-wrap" title="OO">
            <CameraGraphic className="booth-logo__camera" />
          </div>
          <span className="booth-logo__letter" aria-hidden="true">T</span>
          <span className="booth-logo__letter" aria-hidden="true">H</span>
        </section>

        {/* Right side: Two option buttons */}
        <section className="landing__actions" aria-label="Choose how to start">
          <button
            type="button"
            className="booth-option-btn booth-option-btn--primary"
            onClick={() => setSelectedAction('take')}
          >
            <span className="booth-option-btn__sparkle" aria-hidden="true">✦</span>
            <span>take a photo!</span>
          </button>

          <button
            type="button"
            className="booth-option-btn booth-option-btn--secondary"
            onClick={() => setSelectedAction('upload')}
          >
            <span className="booth-option-btn__sparkle" aria-hidden="true">✿</span>
            <span>upload photos</span>
          </button>

          {selectedAction && (
            <p className="landing__status handwritten" role="status">
              {selectedAction === 'take'
                ? 'camera booth view coming right up next! 📸'
                : 'photo uploader view coming right up next! 🎞️'}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
