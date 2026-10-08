import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { describePhoto } from './describe';
import { fileImages, isTouchDevice, Webcam, type Picked } from './PhotoPicker';

export interface PhotoResult extends Picked {
  /** Clothing and belongings seen in the photo, or null if it could not be described. */
  description: string | null;
}

/**
 * Take a photo as the way into a registration: camera (rear camera on phones, webcam on desktops,
 * file upload as a fallback), a preview with Retake / Use photo, then the clothing description.
 */
export const PhotoCapture: React.FC<{ initial?: Picked; onDone: (result: PhotoResult) => void; onCancel: () => void }> = ({
  initial,
  onDone,
  onCancel
}) => {
  const touch = isTouchDevice();
  const [picked, setPicked] = useState<Picked | null>(initial ?? null);
  const [describing, setDescribing] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPicked(await fileImages(file));
      setError('');
    } catch {
      setError('That photo could not be read. Please try another.');
    }
  };

  const retake = () => (touch ? cameraRef.current?.click() : setPicked(null));

  const usePhoto = async () => {
    if (!picked) return;
    setDescribing(true);
    const description = await describePhoto(picked.large);
    onDone({ ...picked, description });
  };

  const uploadButton = (
    <button type="button" onClick={() => fileRef.current?.click()} className="btn-text gap-1.5">
      <Upload className="w-5 h-5" strokeWidth={1.75} />
      Upload a file
    </button>
  );

  return (
    <div className="max-w-xl">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {describing ? (
        <div className="card flex flex-col items-center text-center gap-3 py-8" aria-live="polite">
          {picked && <img src={picked.large} alt="The photo being described" className="w-40 h-40 rounded-button object-cover" />}
          <p className="text-lg font-semibold text-navy">Looking at the photo…</p>
          <p className="text-sm text-navy-muted">Describing the clothing. Name, age and gender are left for you.</p>
        </div>
      ) : picked ? (
        <div className="card p-3">
          <img src={picked.large} alt="Photo preview" className="w-full max-h-[50vh] object-contain rounded-button bg-pressed" />
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button type="button" onClick={usePhoto} className="btn-primary w-auto px-6">
              Use photo
            </button>
            <button type="button" onClick={retake} className="btn-text">
              Retake
            </button>
            {touch && uploadButton}
          </div>
        </div>
      ) : touch ? (
        <div className="card flex flex-col items-start gap-2">
          <p className="text-base text-navy">The camera did not return a photo.</p>
          <button type="button" onClick={() => cameraRef.current?.click()} className="btn-primary w-auto px-6">
            Open the camera
          </button>
          {uploadButton}
        </div>
      ) : (
        <Webcam onCapture={setPicked} onClose={onCancel} extra={uploadButton} />
      )}

      {error && <p className="text-sm text-urgent mt-2">{error}</p>}
      {/* The live webcam has its own Cancel. */}
      {!describing && (picked || touch) && (
        <button type="button" onClick={onCancel} className="btn-text -ml-2 mt-2">
          Back to the other ways to register
        </button>
      )}
    </div>
  );
};
