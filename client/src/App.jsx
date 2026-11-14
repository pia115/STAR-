import { useRef, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage.jsx';
import CameraBoothPage from './pages/CameraBoothPage.jsx';
import UploadBoothPage from './pages/UploadBoothPage.jsx';

export default function App() {
  const [queuedFiles, setQueuedFiles] = useState([]);
  const sharedInputRef = useRef(null);

  const triggerLibraryPicker = () => {
    if (sharedInputRef.current) {
      sharedInputRef.current.value = '';
      sharedInputRef.current.click();
    }
  };

  const handleSharedFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setQueuedFiles(files);
    }
  };

  return (
    <>
      <input
        ref={sharedInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
        multiple
        className="sr-only-input"
        onChange={handleSharedFiles}
        aria-label="Choose up to 4 photos from your device library"
      />
      <Routes>
        <Route
          path="/"
          element={<LandingPage onTriggerLibraryPicker={triggerLibraryPicker} />}
        />
        <Route path="/booth" element={<CameraBoothPage />} />
        <Route
          path="/upload"
          element={
            <UploadBoothPage
              initialFiles={queuedFiles}
              onClearInitialFiles={() => setQueuedFiles([])}
              onOpenLibraryPicker={triggerLibraryPicker}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
