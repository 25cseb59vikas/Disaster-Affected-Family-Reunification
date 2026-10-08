import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { Check, Lock } from 'lucide-react';

type StepState = 'done' | 'current' | 'locked';

const Step: React.FC<{ n: number; label: string; state: StepState }> = ({ n, label, state }) => (
  <li
    className={`flex items-center gap-3 p-3 rounded-button border ${
      state === 'done'
        ? 'bg-verified-bg border-verified-border'
        : state === 'current'
          ? 'bg-pending-bg border-pending-border'
          : 'bg-canvas border-borderSlate'
    }`}
  >
    <span
      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
        state === 'done' ? 'bg-verified text-white' : state === 'current' ? 'bg-pending text-white' : 'bg-borderSlate text-navy-muted'
      }`}
    >
      {state === 'done' ? <Check className="w-4 h-4" strokeWidth={1.75} /> : state === 'locked' ? <Lock className="w-3.5 h-3.5" strokeWidth={1.75} /> : n}
    </span>
    <span className={`flex-1 min-w-0 text-base font-medium ${state === 'locked' ? 'text-navy-muted' : 'text-navy'}`}>{label}</span>
    <span className={`text-sm shrink-0 ${state === 'done' ? 'text-verified' : state === 'current' ? 'text-pending font-medium' : 'text-navy-muted'}`}>
      {state === 'done' ? 'Done' : state === 'current' ? 'Current' : 'Locked'}
    </span>
  </li>
);

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

  const stepState = (n: number): StepState => (n < currentStep ? 'done' : n === currentStep ? 'current' : 'locked');

  return (
    <Screen showBack nav="matches">
      <h1 className="screen-title">Match review</h1>

      <div className="card grid grid-cols-2 gap-2 mb-3">
        {[foundPerson, searchedPerson].map((p, i) => (
          <div key={i} className="min-w-0 flex flex-col items-center text-center p-3 rounded-button bg-canvas">
            <span className="w-14 h-14 rounded-full bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted mb-2 overflow-hidden">
              {p.photoUrl ? <img src={p.photoUrl} alt="" className="w-full h-full object-cover" /> : p.name.charAt(0)}
            </span>
            <span className="w-full text-base font-semibold text-navy truncate">{p.name}</span>
            <span className="text-sm text-navy-muted">Age {p.age}</span>
          </div>
        ))}
      </div>

      <ol className="card space-y-2 mb-4">
        <Step n={1} label="Officer here confirms" state="done" />
        <Step n={2} label="Officer at other site confirms" state={stepState(2)} />
        <Step n={3} label="Family answers a question" state={stepState(3)} />
      </ol>

      <button type="button" onClick={handleConfirmStep} className="btn-primary">
        {currentStep === 2 ? 'Confirm officer check' : 'Go to family check'}
      </button>
      <div className="text-center">
        <button type="button" onClick={() => setIssueFlagged(true)} className="btn-text">
          {issueFlagged ? 'Issue flagged' : 'Flag an issue'}
        </button>
      </div>
      <p className="text-sm text-center text-navy-muted">Location is shown after all three steps.</p>
    </Screen>
  );
};
