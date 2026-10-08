import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { emptyDraft, type VoiceDraft } from '../context/AppContext';
import { extractFromVoice, VOICE_UNAVAILABLE } from '../voice';
import type { RecordType } from '../types';

const MAX_SECONDS = 30;

const FOUND_GUIDE = [
  'Name',
  'Age',
  'Boy/girl, man/woman',
  'Village',
  "Father's or spouse's name",
  'Clothing or marks',
  'Where found'
];

type Phase = 'idle' | 'recording' | 'understanding';

/** Speaking checklist and the microphone. Ends with the extracted draft, or an empty one for "Type instead". */
export const VoiceCapture: React.FC<{ type: RecordType; onDone: (draft: VoiceDraft) => void }> = ({ type, onDone }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone not available', err);
      onDone({ ...emptyDraft, notice: VOICE_UNAVAILABLE });
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setPhase('understanding');
      const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      onDone(await extractFromVoice(audio, type));
    };

    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setPhase('recording');
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stopRecording = () => {
    clearTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handleMicTap = () => {
    if (phase === 'idle') startRecording();
    else if (phase === 'recording') stopRecording();
  };

  useEffect(() => {
    if (phase === 'recording' && seconds >= MAX_SECONDS) stopRecording();
  }, [phase, seconds]);

  // Leaving the screen mid-recording: stop the mic without sending anything.
  useEffect(() => {
    return () => {
      clearTimer();
      const recorder = recorderRef.current;
      if (recorder?.state === 'recording') {
        recorder.onstop = () => recorder.stream.getTracks().forEach(t => t.stop());
        recorder.stop();
      }
    };
  }, []);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const guide = type === 'found' ? FOUND_GUIDE : [...FOUND_GUIDE.slice(0, 6), 'Where last seen', 'Your own name'];

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-center">
      <div className="card py-3 mb-4 lg:mb-0">
        <p className="text-sm font-medium text-navy mb-1">Say, in this order:</p>
        <ol className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-navy">
          {guide.map((item, i) => (
            <li key={item} className="min-w-0">
              <span className="text-navy-muted">{i + 1}.</span> {item}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          id="mic-action-btn"
          onClick={handleMicTap}
          disabled={phase === 'understanding'}
          className={`w-[120px] h-[120px] rounded-full flex items-center justify-center transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
            phase === 'recording'
              ? 'bg-urgent ring-8 ring-urgent/15'
              : 'bg-terracotta hover:bg-terracotta-hover ring-8 ring-terracotta/10'
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

        {phase === 'idle' && (
          <button type="button" onClick={() => onDone(emptyDraft)} className="btn-text mt-2">
            Type instead
          </button>
        )}
      </div>
    </div>
  );
};
