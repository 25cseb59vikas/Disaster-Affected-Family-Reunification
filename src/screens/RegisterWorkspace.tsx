import React, { useState } from 'react';
import { emptyDraft, useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { DetailsForm } from '../intake/DetailsForm';
import type { NewPerson } from '../records';

/**
 * Desktop Register: one workspace instead of three steps. The kind of record at the top, then Speak / Take photo /
 * Type on the left and the live form on the right. Phones keep the step-by-step screens.
 */
export const RegisterWorkspace: React.FC<{ useDraft?: boolean }> = ({ useDraft }) => {
  const { voiceDraft, saveNewPerson, navigateTo } = useApp();
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
        <p className="text-sm font-semibold text-navy">Register a person</p>
      </header>
      <div className="flex-1 min-h-0">
        <DetailsForm
          key="found"
          workspace
          formId="details-form"
          type="found"
          draft={useDraft ? voiceDraft : emptyDraft}
          onSave={save}
          footer={
            <>
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
