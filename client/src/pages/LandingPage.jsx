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

        {/* Right side: Squared option buttons without emojis */}
        <section className="landing__actions" aria-label="Choose how to start">
          <button
            type="button"
            className="booth-option-btn"
            onClick={() => navigate('/booth')}
          >
            take a photo!
          </button>

          <button
            type="button"
            className="booth-option-btn"
            onClick={handleUploadClick}
          >
            upload photos
          </button>
        </section>
      </div>
    </main>
  );
}
