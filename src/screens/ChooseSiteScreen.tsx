import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { SITES } from '../sites';
import type { SiteId } from '../types';

export const ChooseSiteScreen: React.FC = () => {
  const { site, volunteerName, chooseSite } = useApp();
  const [selected, setSelected] = useState<SiteId>(site);
  const [name, setName] = useState<string>(volunteerName);
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!name.trim()) {
      setError('Enter your name so records show who registered them.');
      return;
    }
    chooseSite(selected, name.trim());
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
        {SITES.map(s => {
          const isOn = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={isOn}
              onClick={() => setSelected(s.id)}
              className={`card w-full flex items-center gap-3 text-left cursor-pointer transition-colors active:bg-pressed ${
                isOn ? 'border-navy ring-1 ring-navy' : 'hover:border-navy/30'
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-navy">{s.name}</span>
                <span className="block text-sm text-navy-muted">{s.helper}</span>
              </span>
              <span
                aria-hidden
                className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${isOn ? 'border-navy' : 'border-borderSlate'}`}
              >
                {isOn && <span className="w-2.5 h-2.5 rounded-full bg-navy" />}
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
        onChange={e => {
          setName(e.target.value);
          setError('');
        }}
        placeholder="e.g. Sundaram"
        className="input"
        autoComplete="name"
      />
      {error && <p className="text-sm text-urgent mt-1.5">{error}</p>}
      <p className="text-sm text-navy-muted mt-4">Each site keeps its own records on this device.</p>
    </Screen>
  );
};
