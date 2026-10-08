import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { Check, Lock } from 'lucide-react';

export const MatchReviewScreen: React.FC = () => {
  const { navigateTo, selectedMatch } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(selectedMatch?.step || 2);
  const [issueFlagged, setIssueFlagged] = useState(false);

  const foundPerson = selectedMatch?.foundPerson || {
    name: 'Kavitha R.',
    age: 8,
    photoUrl: '',
    village: 'Kilvelur',
    relativeName: 'Rajan',
    site: 'Camp A – Govt. High School'
  };

  const searchedPerson = selectedMatch?.searchedPerson || {
    name: 'Kavitha Rajan',
    age: 8,
    photoUrl: '',
    village: 'Kilvelur',
    relativeName: 'Rajan',
    site: 'Camp B – Velankanni'
  };

  const handleConfirmStep = () => {
    if (currentStep === 2) {
      setCurrentStep(3);
    } else {
      // Step completed -> Takes to Family Status Portal
      navigateTo('family_status_portal');
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto pb-24">
      <div>
        <TopBar showBack={true} backTitle="Match Review" />

        <main className="p-6 pt-6 space-y-6">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left">
            Match Review
          </h1>

          {/* Two photos side-by-side in clean card */}
          <div className="bg-surface rounded-card border border-borderSlate p-5 shadow-subtle">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-canvas border border-borderSlate">
                <div className="w-20 h-20 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mb-2 overflow-hidden border border-borderSlate">
                  {foundPerson.photoUrl ? (
                    <img src={foundPerson.photoUrl} alt={foundPerson.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{foundPerson.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-[20px] font-bold text-navy leading-snug">
                  {foundPerson.name}
                </span>
                <span className="text-[18px] text-navy-muted">
                  Age {foundPerson.age}
                </span>
              </div>

              <div className="flex flex-col items-center text-center p-3 rounded-lg bg-canvas border border-borderSlate">
                <div className="w-20 h-20 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mb-2 overflow-hidden border border-borderSlate">
                  {searchedPerson.photoUrl ? (
                    <img src={searchedPerson.photoUrl} alt={searchedPerson.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{searchedPerson.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-[20px] font-bold text-navy leading-snug">
                  {searchedPerson.name}
                </span>
                <span className="text-[18px] text-navy-muted">
                  Age {searchedPerson.age}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper card with 3 large numbered steps */}
          <div className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle space-y-4 text-left">
            {/* Step 1: Officer here confirms */}
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-verified-bg border border-verified-border">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-verified text-white flex items-center justify-center text-[16px] font-bold">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <span className="text-[20px] font-bold text-verified">
                  1. Officer here confirms
                </span>
              </div>
              <span className="text-[16px] font-bold text-verified">Done</span>
            </div>

            {/* Step 2: Officer at other site confirms */}
            <div className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
              currentStep === 2
                ? 'bg-amber-50 border-2 border-pending ring-2 ring-pending/10'
                : 'bg-verified-bg border-verified-border'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[16px] font-bold ${
                  currentStep === 2 ? 'bg-pending text-white' : 'bg-verified text-white'
                }`}>
                  {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                </span>
                <span className={`text-[20px] font-bold ${
                  currentStep === 2 ? 'text-navy' : 'text-verified'
                }`}>
                  2. Officer at other site confirms
                </span>
              </div>
              {currentStep === 2 && (
                <span className="text-[16px] font-bold text-pending bg-pending-bg px-2.5 py-0.5 rounded border border-pending-border">
                  Current
                </span>
              )}
            </div>

            {/* Step 3: Family answers a question */}
            <div className={`flex items-center justify-between p-3.5 rounded-lg border ${
              currentStep === 3
                ? 'bg-amber-50 border-2 border-pending ring-2 ring-pending/10'
                : 'bg-canvas border-borderSlate text-navy-muted'
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[16px] font-bold ${
                  currentStep === 3 ? 'bg-pending text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {currentStep === 3 ? '3' : <Lock className="w-3.5 h-3.5" />}
                </span>
                <span className={`text-[20px] font-bold ${
                  currentStep === 3 ? 'text-navy' : 'text-navy-muted'
                }`}>
                  3. Family answers a question
                </span>
              </div>
              {currentStep === 3 ? (
                <span className="text-[16px] font-bold text-pending bg-pending-bg px-2.5 py-0.5 rounded border border-pending-border">
                  Current
                </span>
              ) : (
                <span className="text-[16px] text-navy-muted">Locked</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4 pt-2">
            <button
              type="button"
              onClick={handleConfirmStep}
              className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[20px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center cursor-pointer"
            >
              {currentStep === 2 ? 'Confirm Officer Check' : 'Proceed to Family Verification'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIssueFlagged(true)}
                className="text-[18px] text-civilBlue hover:underline font-medium min-h-[48px] inline-flex items-center justify-center cursor-pointer"
              >
                {issueFlagged ? 'Issue flagged for camp coordinator' : 'Flag an issue'}
              </button>
            </div>

            {/* Location disclaimer line */}
            <p className="text-[18px] text-center text-navy-muted pt-2">
              Location is shown after all three steps.
            </p>
          </div>
        </main>
      </div>

      <div className="h-20" />
      <BottomNav activeTab="matches" />
    </div>
  );
};
