import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';

const ORGS = [
  { name: 'Organization A', helper: 'Camp A & Kilvelur Relief Sector' },
  { name: 'Organization B', helper: 'Velankanni & Coastal Aid Alliance' }
];

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
    <Screen
      header={false}
      footer={
        <button type="button" onClick={handleContinue} className="btn-primary">
          Continue
        </button>
      }
    >
      <h1 className="screen-title pt-4">Where are you working?</h1>

      <div className="card-stack mb-6" role="radiogroup" aria-label="Site">
        {ORGS.map(org => {
          const selected = selectedOrg === org.name;
          return (
            <button
              key={org.name}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setSelectedOrg(org.name)}
              className={`card w-full flex items-center gap-3 text-left cursor-pointer transition-colors active:bg-pressed ${
                selected ? 'border-navy ring-1 ring-navy' : 'hover:border-navy/30'
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-navy">{org.name}</span>
                <span className="block text-sm text-navy-muted">{org.helper}</span>
              </span>
              <span
                aria-hidden
                className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${selected ? 'border-navy' : 'border-borderSlate'}`}
              >
                {selected && <span className="w-2.5 h-2.5 rounded-full bg-navy" />}
              </span>
            </button>
          );
        })}
      </div>

      <label htmlFor="volunteer-name" className="field-label">
        Your name
      </label>
      <input
        id="volunteer-name"
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g. Sundaram"
        className="input"
      />
    </Screen>
  );
};
