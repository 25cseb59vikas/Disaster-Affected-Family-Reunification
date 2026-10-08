import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Phone, ArrowLeft } from 'lucide-react';

export const FamilyStatusPortalScreen: React.FC = () => {
  const { navigateTo } = useApp();
  const [language, setLanguage] = useState<'en' | 'ta'>('en');

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto p-6 pb-12">
      <div className="space-y-6">
        {/* Minimal header with language toggle & back button to volunteer app */}
        <header className="flex items-center justify-between pb-4 border-b border-borderSlate">
          <button
            type="button"
            onClick={() => navigateTo('suggested_matches')}
            className="flex items-center gap-1.5 text-[16px] font-semibold text-civilBlue hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volunteer app</span>
          </button>

          {/* Language Toggle: English | தமிழ் */}
          <div className="flex items-center bg-surface border border-borderSlate rounded-lg p-1 text-[16px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                language === 'en' ? 'bg-navy text-white' : 'text-navy-muted hover:text-navy'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                language === 'ta' ? 'bg-navy text-white' : 'text-navy-muted hover:text-navy'
              }`}
            >
              தமிழ்
            </button>
          </div>
        </header>

        {/* 1. Large Status Card */}
        <article className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle space-y-5 text-left">
          {/* Large Status Sentences in English and Tamil */}
          <div className="space-y-2 border-l-4 border-pending pl-4 py-1">
            <h2 className="text-[26px] font-bold text-navy leading-tight">
              A possible match is being checked.
            </h2>
            <p className="text-[22px] font-bold text-navy leading-normal">
              சாத்தியமான பொருத்தம் சரிபார்க்கப்படுகிறது.
            </p>
          </div>

          <div className="pt-2">
            <p className="text-[20px] font-semibold text-navy-muted">
              Searching for: <span className="text-navy font-bold">Selvi Rajesh (~28 yrs)</span>
            </p>
          </div>
        </article>

        {/* 2. Helpline Number as Big Button */}
        <div>
          <a
            href="tel:1077"
            className="w-full h-14 min-h-[56px] bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[20px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center gap-3 cursor-pointer select-none"
          >
            <Phone className="w-6 h-6 stroke-[2.2]" />
            <span>Call Helpline: 1077</span>
          </a>
        </div>

        {/* 3. Nearest Help Desk Card */}
        <article className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle space-y-2 text-left">
          <h3 className="text-[22px] font-bold text-navy">
            Nearest Help Desk
          </h3>
          <p className="text-[20px] text-navy font-semibold">
            Desk 3, Camp A – Govt. High School
          </p>
          <p className="text-[18px] text-verified font-medium">
            Open 24 hours
          </p>
        </article>
      </div>

      <footer className="pt-8 text-center text-navy-muted text-[16px]">
        Government of Disaster Management Authority · Reunite Public Portal
      </footer>
    </div>
  );
};
