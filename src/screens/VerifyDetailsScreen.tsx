import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { DetailsForm } from '../intake/DetailsForm';
import type { NewPerson } from '../records';

export const VerifyDetailsScreen: React.FC = () => {
  const { navigateTo, registrationType, voiceDraft, saveNewPerson } = useApp();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (person: NewPerson) => {
    setIsSaving(true);
    await saveNewPerson(person);
    setIsSaving(false);
    navigateTo('saved');
  };

  return (
    <Screen
      showBack
      footer={
        <button type="submit" form="details-form" id="saveButton" disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <h1 className="screen-title">Check the details</h1>
      {registrationType === 'seeking' && (
        <p className="text-sm text-navy-muted -mt-2 mb-4">Name, age and clothing are about the missing person.</p>
      )}
      <DetailsForm formId="details-form" type={registrationType} draft={voiceDraft} onSave={handleSave} />
    </Screen>
  );
};
