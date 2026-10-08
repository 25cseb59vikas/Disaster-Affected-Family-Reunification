import { useEffect, useRef, useState } from 'react';
import { emptyDraft, type VoiceDraft } from '../context/AppContext';
import { extractFromVoice, VOICE_UNAVAILABLE } from '../voice';
import type { RecordType } from '../types';

export const MAX_SECONDS = 30;

const FOUND_GUIDE = [
  'Name',
  'Age',
  'Boy/girl, man/woman',
  'Village',
  "Father's or spouse's name",
  'Clothing or marks',
  'Where found'
];

/** What to say, in order, for this kind of record. */
export const speakingGuide = (type: RecordType) =>
  type === 'found' ? FOUND_GUIDE : [...FOUND_GUIDE.slice(0, 6), 'Where last seen', 'Your own name'];

export const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export type VoicePhase = 'idle' | 'recording' | 'understanding';

/**
 * The microphone: tap to start, tap again (or 30 s) to stop, then the voice server fills a draft.
 * Without a microphone or server, onDone gets an empty draft with a notice so the volunteer can type.
 */
export function useVoiceRecorder(type: RecordType, onDone: (draft: VoiceDraft) => void) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone not available', err);
      onDoneRef.current({ ...emptyDraft, notice: VOICE_UNAVAILABLE });
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
      const draft = await extractFromVoice(audio, type);
      setPhase('idle');
      onDoneRef.current(draft);
    };

    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setPhase('recording');
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stop = () => {
    clearTimer();
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const toggle = () => {
    if (phase === 'idle') start();
    else if (phase === 'recording') stop();
  };

  useEffect(() => {
    if (phase === 'recording' && seconds >= MAX_SECONDS) stop();
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

  return { phase, seconds, toggle };
}
