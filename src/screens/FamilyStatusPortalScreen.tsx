import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { Phone, ArrowLeft } from 'lucide-react';

export const FamilyStatusPortalScreen: React.FC = () => {
  const { navigateTo } = useApp();
  const [language, setLanguage] = useState<'en' | 'ta'>('en');

  return (
    <Screen header={false}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button type="button" onClick={() => navigateTo('suggested_matches')} className="btn-text -ml-2 gap-1 text-sm">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.75} />
          <span>Volunteer app</span>
        </button>

        <div className="flex shrink-0 p-0.5 rounded-button bg-surface border border-borderSlate text-sm font-medium">
          {(['en', 'ta'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              aria-pressed={language === l}
              className={`min-h-[40px] px-3 rounded-badge ${language === l ? 'bg-navy text-white' : 'text-navy-muted hover:text-navy'}`}
            >
              {l === 'en' ? 'English' : 'தமிழ்'}
            </button>
          ))}
        </div>
      </div>

      <article className="card mb-3">
        <div className="border-l-4 border-pending pl-3 space-y-1">
          <h1 className="text-xl font-semibold text-navy">A possible match is being checked.</h1>
          <p className="text-lg font-semibold text-navy">சாத்தியமான பொருத்தம் சரிபார்க்கப்படுகிறது.</p>
        </div>
        <p className="text-base text-navy-muted mt-3">
          Searching for: <span className="text-navy font-medium">Selvi Rajesh (~28 yrs)</span>
        </p>
      </article>

      <a href="tel:1077" className="btn-primary mb-3">
        <Phone className="w-5 h-5" strokeWidth={1.75} />
        <span>Call helpline: 1077</span>
      </a>

      <article className="card">
        <h2 className="text-lg font-semibold text-navy">Nearest help desk</h2>
        <p className="text-base text-navy">Desk 3, Camp A – Govt. High School</p>
        <p className="text-sm text-verified">Open 24 hours</p>
      </article>

      <p className="pt-6 text-center text-xs text-navy-muted">Reunite family status</p>
    </Screen>
  );
};
