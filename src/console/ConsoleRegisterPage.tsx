import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Search, UserPlus } from 'lucide-react';
import { useApp, type VoiceDraft } from '../context/AppContext';
import { VoiceCapture } from '../intake/VoiceCapture';
import { DetailsForm } from '../intake/DetailsForm';
import type { NewPerson } from '../records';
import type { PersonRecord, RecordType } from '../types';
import { linkProps } from './route';

type Step = { at: 'type' } | { at: 'speak'; type: RecordType } | { at: 'details'; type: RecordType; draft: VoiceDraft } | { at: 'saved'; record: PersonRecord };

/** /console/register: the field app's intake (voice, typing, photo) at the authority desk. */
export const ConsoleRegisterPage: React.FC = () => {
  const { saveNewPerson, waitingCount } = useApp();
  const [step, setStep] = useState<Step>({ at: 'type' });
  const [saving, setSaving] = useState(false);

  const save = async (type: RecordType, person: NewPerson) => {
    setSaving(true);
    const record = await saveNewPerson(person, type);
    setSaving(false);
    setStep({ at: 'saved', record });
  };

  const back = (to: Step) => (
    <button type="button" onClick={() => setStep(to)} className="btn-text -ml-2 mb-2 gap-1">
      <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> Back
    </button>
  );

  if (step.at === 'type') {
    return (
      <>
        <h1 className="screen-title">Register at the authority desk</h1>
        <div className="grid gap-3 md:grid-cols-2 max-w-3xl">
          {(
            [
              ['found', UserPlus, 'Person found here', 'Someone who has arrived at this desk'],
              ['seeking', Search, 'Looking for someone', 'A family member is searching']
            ] as const
          ).map(([type, Icon, title, helper]) => (
            <button
              key={type}
              type="button"
              onClick={() => setStep({ at: 'speak', type })}
              className="card w-full min-h-[72px] flex items-center gap-3 text-left hover:border-navy/30 active:bg-pressed"
            >
              <span className="w-10 h-10 shrink-0 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
                <Icon className="icon" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-navy">{title}</span>
                <span className="block text-sm text-navy-muted">{helper}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm text-navy-muted mt-4">Every registration is saved on this device first. Sync sends it when the server can be reached.</p>
      </>
    );
  }

  if (step.at === 'speak') {
    return (
      <div className="max-w-4xl">
        {back({ at: 'type' })}
        <h1 className="screen-title">{step.type === 'found' ? 'Person found here' : 'Looking for someone'}</h1>
        <VoiceCapture type={step.type} onDone={draft => setStep({ at: 'details', type: step.type, draft })} />
      </div>
    );
  }

  if (step.at === 'details') {
    return (
      <div className="max-w-5xl">
        {back({ at: 'speak', type: step.type })}
        <h1 className="screen-title">Check the details</h1>
        {step.type === 'seeking' && <p className="text-sm text-navy-muted -mt-2 mb-4">Name, age and clothing are about the missing person.</p>}
        <DetailsForm formId="console-details" type={step.type} draft={step.draft} onSave={p => save(step.type, p)} />
        <div className="mt-6 flex justify-end">
          <button type="submit" form="console-details" disabled={saving} className="btn-primary w-auto min-w-[200px] px-8">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  const r = step.record;
  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="icon text-verified" />
        <h1 className="text-xl font-semibold text-navy">Saved</h1>
      </div>
      <div className="card">
        <p className="text-sm text-navy-muted">Record code</p>
        <p className="text-xl font-semibold text-navy tracking-wide">{r.code}</p>
        <p className="text-sm text-navy-muted mt-1">Write this code down for the person or their family.</p>
        <p className="text-base text-navy mt-3 truncate">{r.name ?? 'No name given'}</p>
        <p className="text-sm text-navy-muted">{waitingCount ? 'Waiting to sync' : 'Synced'}</p>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <button type="button" onClick={() => setStep({ at: 'type' })} className="btn-primary w-auto px-6">
          Register next person
        </button>
        <a {...linkProps(`/console/records/${r.id}`)} className="btn-text">
          Open the record
        </a>
      </div>
    </div>
  );
};
