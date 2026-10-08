import React, { useState, useEffect, useRef } from 'react';
import { useApp, emptyDraft } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { Mic, Square } from 'lucide-react';
import { extractFromVoice, VOICE_UNAVAILABLE } from '../voice';

const MAX_SECONDS = 30;

type Phase = 'idle' | 'recording' | 'understanding';

export const RegisterSpeakScreen: React.FC = () => {
  const { navigateTo, registrationType, setVoiceDraft } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const title = registrationType === 'found' ? 'Person found here' : 'Looking for someone';

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const goToVerify = (draft = emptyDraft) => {
    setVoiceDraft(draft);
    navigateTo('verify_details');
  };

  const startRecording = async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone not available', err);
      goToVerify({ ...emptyDraft, notice: VOICE_UNAVAILABLE });
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
      goToVerify(await extractFromVoice(audio, registrationType));
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

  return (
    <Screen showBack>
      <h1 className="screen-title">{title}</h1>
      <div className="flex flex-col items-center text-center pt-6">
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
          {phase === 'recording'
            ? <Square className="w-10 h-10 text-white fill-white" strokeWidth={1.75} />
            : <Mic className="w-12 h-12 text-white" strokeWidth={1.75} />}
        </button>

        <p className="text-base font-semibold text-navy mt-5" aria-live="polite">
          {phase === 'recording' ? 'Listening…' : phase === 'understanding' ? 'Understanding…' : 'Tap and speak'}
        </p>

        {phase === 'recording' ? (
          <p className="mt-1 text-sm font-medium text-urgent">
            {formatTimer(seconds)} of {formatTimer(MAX_SECONDS)} · Tap to stop
          </p>
        ) : phase === 'idle' ? (
          <p className="mt-1 text-sm text-navy-muted max-w-[280px]">
            Say: name, age, village, father's name, what they are wearing, who they are looking for
          </p>
        ) : null}

        {phase === 'idle' && (
          <button type="button" onClick={() => goToVerify()} className="btn-text mt-8">
            Type instead
          </button>
        )}
      </div>
    </Screen>
  );
};
