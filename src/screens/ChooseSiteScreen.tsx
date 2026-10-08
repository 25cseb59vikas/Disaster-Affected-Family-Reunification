import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const ChooseSiteScreen: React.FC = () => {
  const { navigateTo, volunteerName, setVolunteerName, currentOrg, setCurrentOrg, setCurrentSite } = useApp();
  const [selectedOrg, setSelectedOrg] = useState<string>(currentOrg || 'Organization A');
  const [name, setName] = useState<string>(volunteerName || 'Sundaram');

  const handleContinue = () => {
    setCurrentOrg(selectedOrg);
    setVolunteerName(name.trim() || 'Sundaram');
    if (selectedOrg === 'Organization A') {
      setCurrentSite('Camp A – Govt. High School');
    } else {
      setCurrentSite('Camp B – Velankanni Relief Center');
    }
    navigateTo('register_choose_type');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between p-6 max-w-lg mx-auto pb-24">
      <div className="pt-8">
        {/* Title */}
        <h1 className="text-[28px] font-bold text-navy leading-tight tracking-tight text-left mb-8">
          Where are you working?
        </h1>

        {/* Organization Selection Cards */}
        <div className="space-y-5 mb-8">
          {/* Card 1: Organization A */}
          <button
            type="button"
            onClick={() => setSelectedOrg('Organization A')}
            className={`w-full min-h-[80px] p-6 rounded-card text-left transition-all bg-surface border ${
              selectedOrg === 'Organization A'
                ? 'border-2 border-navy shadow-md ring-2 ring-navy/10'
                : 'border-borderSlate shadow-subtle hover:border-navy/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[22px] font-bold text-navy">
                Organization A
              </span>
              {selectedOrg === 'Organization A' && (
                <span className="w-4 h-4 rounded-full bg-navy flex-shrink-0" />
              )}
            </div>
            <p className="text-[18px] text-navy-muted mt-1">
              Camp A & Kilvelur Relief Sector
            </p>
          </button>

          {/* Card 2: Organization B */}
          <button
            type="button"
            onClick={() => setSelectedOrg('Organization B')}
            className={`w-full min-h-[80px] p-6 rounded-card text-left transition-all bg-surface border ${
              selectedOrg === 'Organization B'
                ? 'border-2 border-navy shadow-md ring-2 ring-navy/10'
                : 'border-borderSlate shadow-subtle hover:border-navy/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[22px] font-bold text-navy">
                Organization B
              </span>
              {selectedOrg === 'Organization B' && (
                <span className="w-4 h-4 rounded-full bg-navy flex-shrink-0" />
              )}
            </div>
            <p className="text-[18px] text-navy-muted mt-1">
              Velankanni & Coastal Aid Alliance
            </p>
          </button>
        </div>

        {/* Name input */}
        <div className="space-y-2 mb-8">
          <label htmlFor="volunteer-name" className="block text-[18px] font-semibold text-navy text-left">
            Your name
          </label>
          <input
            id="volunteer-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sundaram"
            className="w-full h-14 px-4 text-[18px] text-navy bg-surface border border-borderSlate rounded-input focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-all"
          />
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-canvas/95 backdrop-blur-sm border-t border-borderSlate max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[18px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
