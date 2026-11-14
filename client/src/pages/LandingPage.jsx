import { useNavigate } from 'react-router-dom';

export default function LandingPage({ onTriggerLibraryPicker }) {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    if (onTriggerLibraryPicker) {
      onTriggerLibraryPicker();
    }
    navigate('/upload');
  };

  return (
    <main className="landing">
      {/* Only the two original flower graphics from the user's sketch, un-refined */}
      <img
        src="/flower-sketch.png"
        alt=""
        aria-hidden="true"
        className="sketch-flower sketch-flower--top-right"
      />
      <img
        src="/flower-bl-sketch.png"
        alt=""
        aria-hidden="true"
        className="sketch-flower sketch-flower--bottom-left"
      />

      {/* Idea #2: Hand-drawn sketchy booth frame around the center (easily reversible) */}
      <div className="landing__sketch-frame">
        <svg
          className="landing__sketch-frame-svg"
          viewBox="0 0 920 540"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 18 22 Q 460 12, 902 20 Q 910 270, 900 518 Q 455 528, 16 516 Q 10 268, 18 22 Z"
            fill="none"
            stroke="#fffef7"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 28 32 Q 465 26, 890 31 Q 896 272, 888 506 Q 458 514, 27 505 Q 22 265, 28 32 Z"
            fill="none"
            stroke="#fffef7"
            strokeWidth="1.2"
            strokeOpacity="0.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="landing__content">
          {/* Left side: Vertical B - [User's exact camera sketch as OO] - T - H */}
          <section className="booth-logo" aria-label="BOOTH">
            <span className="booth-logo__letter booth-logo__letter--b" aria-hidden="true">
              B
            </span>
            <div className="booth-logo__camera-wrap" title="OO">
              <img
                src="/camera-sketch.png"
                alt="Vintage camera representing OO"
                className="booth-logo__camera-img"
              />
            </div>
            <span className="booth-logo__letter booth-logo__letter--t" aria-hidden="true">
              T
            </span>
            <span className="booth-logo__letter booth-logo__letter--h" aria-hidden="true">
              H
            </span>
          </section>

          {/* Right side: Squared option buttons with user's exact handwritten text */}
          <section className="landing__actions" aria-label="Choose how to start">
            <button
              type="button"
              className="booth-option-btn"
              onClick={() => navigate('/booth')}
              aria-label="take a photo!"
            >
              <img
                src="/btn-take-photo.png"
                alt="take a photo!"
                className="booth-option-btn__handwritten"
              />
            </button>

            <button
              type="button"
              className="booth-option-btn"
              onClick={handleUploadClick}
              aria-label="upload photos"
            >
              <img
                src="/btn-upload-photos.png"
                alt="upload photos"
                className="booth-option-btn__handwritten"
              />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
