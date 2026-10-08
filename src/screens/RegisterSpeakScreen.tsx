import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Mic } from 'lucide-react';

export const RegisterSpeakScreen: React.FC = () => {
  const { navigateTo, registrationType, setVoiceDraft } = useApp();
  const [isRecording, setIsRecording] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const title = registrationType === 'found' ? 'Person found here' : 'Looking for someone';

  const startRecording = () => {
    setIsRecording(true);
    setTimerSeconds(0);
    intervalRef.current = window.setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRecording(false);

    // Save transcription and parsed fields into voiceDraft
    setVoiceDraft({
      transcript: "Transcript: Murugan, around 35 years old, male, from Kilvelur, father Ramasamy, wearing blue shirt and black pants",
      name: "Murugan",
      gender: "Male",
      ageBand: "19–59",
      approxAge: 35,
      village: "Kilvelur",
      relativeName: "Ramasamy",
      relativeNeedsCheck: true, // System unsure about father's name as specified in Stitch
      clothingMarks: "Blue shirt, black pants, scar on left eyebrow",
      hasMissingFamily: false,
      photoUrl: ""
    });

    // Navigate to Verify Details (Screen 4)
    navigateTo('verify_details');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTypeInstead = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    navigateTo('verify_details');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto">
      <div>
        <TopBar showBack={true} backTitle={title} />

        <main className="p-6 pt-12 flex flex-col items-center text-center">
          {/* Centered Microphone Action Area */}
          <div className="mt-8 flex flex-col items-center">
            <button
              type="button"
              id="mic-action-btn"
              onClick={toggleRecording}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg cursor-pointer ${
                isRecording
                  ? 'bg-red-600 animate-pulse scale-105 ring-8 ring-red-300'
                  : 'bg-terracotta hover:bg-terracotta-hover active:scale-95 ring-4 ring-terracotta/20'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start speaking'}
            >
              <Mic className="w-16 h-16 text-white stroke-[2.2]" />
            </button>

            {/* Label directly under button */}
            <h2 className="text-[22px] font-bold text-navy mt-6">
              {isRecording ? 'Listening...' : 'Tap and speak'}
            </h2>

            {/* Recording timer or state indicator */}
            {isRecording ? (
              <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 text-red-800 text-[18px] font-semibold">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span>{formatTimer(timerSeconds)} · Tap to stop</span>
              </div>
            ) : (
              <p className="text-[18px] text-[#6B7280] mt-3 max-w-xs leading-relaxed">
                Say: name, age, village, father's name, what they are wearing
              </p>
            )}
          </div>

          {/* Generous margin and Type Instead link */}
          <div className="mt-16">
            <button
              type="button"
              onClick={handleTypeInstead}
              className="text-[20px] font-medium text-civilBlue hover:underline p-3 cursor-pointer"
            >
              Type instead
            </button>
          </div>
        </main>
      </div>

      <div className="p-6 text-center text-navy-muted text-[16px]">
        Reunite Relief Voice Intake
      </div>
    </div>
  );
};
