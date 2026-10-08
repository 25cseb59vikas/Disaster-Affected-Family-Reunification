import React, { useRef, useState } from 'react';
import { Camera, Keyboard, Mic, Square } from 'lucide-react';
import { emptyDraft, type VoiceDraft } from '../context/AppContext';
import type { RecordType } from '../types';
import { DESCRIBE_FAILED } from './describe';
import { PhotoCapture, type PhotoResult } from './PhotoCapture';
import { fileImages, isTouchDevice, type Picked } from './PhotoPicker';
import { formatTimer, MAX_SECONDS, speakingGuide, useVoiceRecorder } from './VoiceCapture';

/** A draft for Verify from a photo: the photo attached and clothing filled in; name, age and gender left empty. */
function photoDraft(p: PhotoResult): VoiceDraft {
  return {
    ...emptyDraft,
    photo: p.thumbnail,
    photoLarge: p.large,
    clothingMarks: p.description ?? '',
    clothingFromPhoto: Boolean(p.description),
    unsure: p.description ? ['clothing_or_marks'] : [],
    notice: p.description ? '' : DESCRIBE_FAILED
  };
}

/**
 * The three ways to start a registration: speak, take a photo, or type.
 * Phones: the mic with its guide, then "Take photo" and "Type instead" below.
 * Desktop: three cards in a row, with the speaking guide beside the mic.
 */
export const IntakeChooser: React.FC<{ type: RecordType; onDone: (draft: VoiceDraft) => void }> = ({ type, onDone }) => {
  const { phase, seconds, toggle } = useVoiceRecorder(type, onDone);
  const [photo, setPhoto] = useState<{ initial?: Picked } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const idle = phase === 'idle';

  // On phones the camera has to open straight from the tap, so the file input lives here.
  const takePhoto = () => (isTouchDevice() ? cameraRef.current?.click() : setPhoto({}));
  const handleCamera = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto({ initial: await fileImages(file) });
    } catch {
      setPhoto({});
    }
  };

  if (photo) return <PhotoCapture initial={photo.initial} onCancel={() => setPhoto(null)} onDone={p => onDone(photoDraft(p))} />;

  const option =
    'w-full flex items-center justify-center gap-2 text-base font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-default ' +
    'lg:card lg:h-auto lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:p-5 lg:text-left lg:hover:border-navy/40 lg:hover:bg-surface';

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-4 lg:items-stretch">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCamera} className="hidden" />

      <section aria-label="Speak" className="lg:card lg:p-5 lg:flex lg:items-center lg:gap-6">
        <div className="card py-3 mb-4 lg:mb-0 lg:order-2 lg:flex-1 lg:min-w-0 lg:p-0 lg:border-0 lg:shadow-none">
          <p className="text-sm font-medium text-navy mb-1">Say, in this order:</p>
          <ol className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-navy">
            {speakingGuide(type).map((item, i) => (
              <li key={item} className="min-w-0">
                <span className="text-navy-muted">{i + 1}.</span> {item}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col items-center text-center lg:order-1 lg:shrink-0 lg:w-40">
          <button
            type="button"
            id="mic-action-btn"
            onClick={toggle}
            disabled={phase === 'understanding'}
            className={`w-[120px] h-[120px] rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
              phase === 'recording' ? 'bg-urgent ring-8 ring-urgent/15' : 'bg-terracotta hover:bg-terracotta-hover ring-8 ring-terracotta/10'
            }`}
            aria-label={phase === 'recording' ? 'Stop recording' : 'Start speaking'}
          >
            {phase === 'recording' ? (
              <Square className="w-10 h-10 text-white fill-white" strokeWidth={1.75} />
            ) : (
              <Mic className="w-12 h-12 text-white" strokeWidth={1.75} />
            )}
          </button>
          <p className="text-base font-semibold text-navy mt-4" aria-live="polite">
            {phase === 'recording' ? 'Listening…' : phase === 'understanding' ? 'Understanding…' : 'Tap and speak'}
          </p>
          {phase === 'recording' && (
            <p className="mt-1 text-sm font-medium text-urgent">
              {formatTimer(seconds)} of {formatTimer(MAX_SECONDS)} · Tap to stop
            </p>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={takePhoto}
        disabled={!idle}
        className={`${option} mt-5 h-12 rounded-button border border-navy-muted/40 bg-surface text-navy hover:border-navy ${idle ? '' : 'max-lg:hidden'} lg:mt-0`}
      >
        <Camera className="icon lg:w-8 lg:h-8 lg:mb-2 lg:text-terracotta" />
        <span className="lg:text-lg lg:font-semibold">Take photo</span>
        <span className="hidden lg:block text-sm font-normal text-navy-muted">The clothing is described for you to check.</span>
      </button>

      <button
        type="button"
        onClick={() => onDone(emptyDraft)}
        disabled={!idle}
        className={`${option} mt-1 min-h-[44px] text-civilBlue max-lg:hover:underline lg:text-navy ${idle ? '' : 'max-lg:hidden'} lg:mt-0`}
      >
        <Keyboard className="hidden lg:block w-8 h-8 mb-2 text-terracotta" strokeWidth={1.75} />
        <span className="lg:text-lg lg:font-semibold">Type instead</span>
        <span className="hidden lg:block text-sm font-normal text-navy-muted">Fill in the form yourself.</span>
      </button>
    </div>
  );
};
