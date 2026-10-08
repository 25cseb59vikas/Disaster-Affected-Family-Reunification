import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload } from 'lucide-react';

const THUMBNAIL_PX = 240;

/** Draws an image or video frame at most THUMBNAIL_PX on its long side, as a small JPEG data URL. */
function toThumbnail(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, THUMBNAIL_PX / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

// Shrinks a picked image so it fits in IndexedDB and sync payloads.
function fileThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(toThumbnail(img, img.width, img.height));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

// Phones and tablets (touch as the main pointer) open the rear camera through the file picker.
// Laptops and desktops get the webcam as well as file upload.
const isTouchDevice = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const Webcam: React.FC<{ onCapture: (url: string) => void; onClose: () => void }> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      .then(s => {
        if (cancelled) return s.getTracks().forEach(t => t.stop());
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('The camera could not be opened. Allow camera access, or upload a file instead.'));
    if (!navigator.mediaDevices) setError('This browser cannot open the camera here. Upload a file instead.');
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    onCapture(toThumbnail(v, v.videoWidth, v.videoHeight));
  };

  return (
    <div className="card p-3">
      {error ? (
        <p role="alert" className="text-sm text-urgent">{error}</p>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="w-full max-w-sm aspect-[4/3] rounded-button bg-header object-cover"
        />
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {!error && (
          <button type="button" onClick={capture} disabled={!ready} className="btn-primary w-auto px-5 disabled:cursor-wait">
            <Camera className="w-5 h-5" strokeWidth={1.75} />
            Capture
          </button>
        )}
        <button type="button" onClick={onClose} className="btn-text">
          Cancel
        </button>
      </div>
    </div>
  );
};

/** "Add photo": rear camera on phones; webcam or file upload on desktops. */
export const PhotoPicker: React.FC<{ value: string | null; onChange: (url: string | null) => void }> = ({ value, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [webcamOpen, setWebcamOpen] = useState(false);
  const touch = isTouchDevice();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await fileThumbnail(file));
      setError('');
    } catch {
      setError('That photo could not be read. Please try another.');
    }
  };

  const takePhoto = () => (touch ? cameraRef.current?.click() : setWebcamOpen(true));

  const dashed =
    'h-12 rounded-button border border-dashed border-navy-muted/40 bg-surface hover:border-navy text-navy flex items-center justify-center gap-2 text-base font-medium cursor-pointer';

  return (
    <div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {webcamOpen ? (
        <Webcam
          onCapture={url => {
            onChange(url);
            setError('');
            setWebcamOpen(false);
          }}
          onClose={() => setWebcamOpen(false)}
        />
      ) : value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="Photo of this person" className="w-20 h-20 rounded-button object-cover border border-borderSlate" />
          <div className="flex flex-col items-start">
            <button type="button" onClick={takePhoto} className="btn-text">
              {touch ? 'Change photo' : 'Retake with webcam'}
            </button>
            {!touch && (
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-text">
                Upload a different file
              </button>
            )}
            <button type="button" onClick={() => onChange(null)} className="btn-text">
              Remove photo
            </button>
          </div>
        </div>
      ) : touch ? (
        <button type="button" onClick={takePhoto} className={`w-full ${dashed}`}>
          <Camera className="icon" />
          <span>Add photo</span>
        </button>
      ) : (
        <div>
          <p className="field-label">Add photo</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={takePhoto} className={dashed}>
              <Camera className="icon" />
              <span>Use webcam</span>
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className={dashed}>
              <Upload className="icon" />
              <span>Upload a file</span>
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-urgent mt-1.5">{error}</p>}
    </div>
  );
};
