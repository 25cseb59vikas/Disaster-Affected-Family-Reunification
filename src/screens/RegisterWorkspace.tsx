import React, { useState } from 'react';
import { emptyDraft, useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { DetailsForm } from '../intake/DetailsForm';
import type { NewPerson } from '../records';
import type { RecordType } from '../types';

const TYPES: Array<[RecordType, string, string]> = [
  ['found', 'Person found here', 'Someone who has arrived at this site'],
  ['seeking', 'Looking for someone', 'A family member is searching']
];

/**
 * Desktop Register: one workspace instead of three steps. The kind of record at the top, then Speak / Take photo /
 * Type on the left and the live form on the right. Phones keep the step-by-step screens.
 */
export const RegisterWorkspace: React.FC<{ useDraft?: boolean }> = ({ useDraft }) => {
  const { registrationType, setRegistrationType, voiceDraft, saveNewPerson, navigateTo } = useApp();
  const [saving, setSaving] = useState(false);

  const save = async (person: NewPerson) => {
    setSaving(true);
    await saveNewPerson(person);
    setSaving(false);
    navigateTo('saved');
  };

  return (
    <Screen nav="register" width="wide" fill>
      <header className="flex-none flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-3 mb-4 border-b border-borderSlate">
        <div>
          <h1 className="font-display text-title font-semibold tracking-tight text-navy leading-tight">Register</h1>
          <p className="text-sm text-navy-muted">Speak, take a photo or type. Everything lands in the form on the right.</p>
        </div>
        <div role="radiogroup" aria-label="Kind of record" className="grid grid-cols-2 p-1 rounded-panel bg-pressed">
          {TYPES.map(([t, label, helper]) => {
            const on = registrationType === t;
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={on}
                title={helper}
                onClick={() => setRegistrationType(t)}
                className={`h-9 px-4 rounded-cell text-sm font-medium motion-safe:transition-colors ${on ? 'bg-surface text-navy shadow-panel' : 'text-navy-muted hover:text-navy'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>
      <div className="flex-1 min-h-0">
        <DetailsForm
          key={registrationType}
          workspace
          formId="details-form"
          type={registrationType}
          draft={useDraft ? voiceDraft : emptyDraft}
          onSave={save}
          footer={
            <>
              {registrationType === 'seeking' && <p className="mr-auto text-xs text-navy-muted">Name, age and clothing are about the missing person.</p>}
              <button type="submit" form="details-form" disabled={saving} className="ws-btn ws-btn-accent min-w-[120px]">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          }
        />
      </div>
    </Screen>
  );
};
