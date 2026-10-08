import React, { useState } from 'react';
import type { VoiceDraft } from '../context/AppContext';
import type { NewPerson } from '../records';
import type { AgeBand, Gender, LookingFor, RecordType } from '../types';
import { PhotoPicker } from './PhotoPicker';
import { RelationSelect } from './RelationSelect';

const inputClass = (unsure: boolean) => `input ${unsure ? 'input-unsure' : ''}`;
const chipClass = (on: boolean, unsure: boolean) => `chip ${on ? 'chip-on' : unsure ? 'input-unsure' : ''}`;

const PleaseCheck: React.FC = () => <span className="badge bg-pending-bg text-pending border-pending-border">Please check</span>;

const FieldLabel: React.FC<{ htmlFor?: string; label: string; unsure: boolean }> = ({ htmlFor, label, unsure }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-navy">
      {label}
    </label>
    {unsure && <PleaseCheck />}
  </div>
);

const TextField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unsure: boolean;
  required?: boolean;
}> = ({ id, label, value, onChange, unsure, required }) => (
  <div>
    <FieldLabel htmlFor={id} label={label} unsure={unsure} />
    <input id={id} type="text" value={value} required={required} onChange={e => onChange(e.target.value)} className={inputClass(unsure)} />
  </div>
);

interface DetailsFormProps {
  /** The submit button lives outside (pinned footer), linked with form={formId}. */
  formId: string;
  type: RecordType;
  draft: VoiceDraft;
  /** 'family': a relative fills this in for themselves; their phone number is required. */
  variant?: 'site' | 'family';
  onSave: (person: NewPerson) => void;
}

/** Check and complete the details of a new record (after voice, or typed from scratch). */
export const DetailsForm: React.FC<DetailsFormProps> = ({ formId, type, draft, variant = 'site', onSave }) => {
  const unsure = (field: string) => draft.unsure.includes(field);
  const family = variant === 'family';
  const isFound = type === 'found';

  const [name, setName] = useState(draft.name);
  const [gender, setGender] = useState<Gender>(draft.gender);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(draft.ageBand);
  const [village, setVillage] = useState(draft.village);
  const [relativeName, setRelativeName] = useState(draft.relativeName);
  const [relativeRelation, setRelativeRelation] = useState(draft.relativeRelation);
  const [clothingMarks, setClothingMarks] = useState(draft.clothingMarks);
  const [foundWhere, setFoundWhere] = useState(draft.foundWhere);
  const [privateDetail, setPrivateDetail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [lookingFor, setLookingFor] = useState<LookingFor[]>(draft.lookingFor);
  const [hasMissingFamily, setHasMissingFamily] = useState(draft.lookingFor.length > 0);
  const [photo, setPhoto] = useState<string | null>(null);

  const updateLookingFor = (i: number, patch: Partial<LookingFor>) =>
    setLookingFor(prev => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || null,
      gender,
      age_band: ageBand,
      village: village.trim() || null,
      relative_name: relativeName.trim() || null,
      relative_relation: relativeRelation.trim() || null,
      clothing_marks: clothingMarks.trim() || null,
      found_where: isFound ? foundWhere.trim() || null : null,
      last_seen: isFound ? null : foundWhere.trim() || null,
      private_detail: isFound ? privateDetail.trim() || null : null,
      contact_phone: isFound ? null : contactPhone.trim() || null,
      household_id: null,
      has_missing_family: isFound && hasMissingFamily,
      looking_for:
        isFound && hasMissingFamily
          ? lookingFor
              .filter(p => p.relation.trim() || p.name?.trim())
              .map(p => ({ relation: p.relation.trim(), name: p.name?.trim() || null }))
          : [],
      transcript: draft.transcript || null,
      photo
    });
  };

  return (
    <form id={formId} onSubmit={submit}>
      {draft.notice && (
        <p role="alert" className="card mb-4 bg-pending-bg border-pending-border text-base font-medium text-navy">
          {draft.notice}
        </p>
      )}

      {draft.transcript && (
        <div className="mb-4 p-3 rounded-card bg-pressed text-sm text-navy">
          <span className="font-medium text-navy-muted">What was heard: </span>
          {draft.transcript}
        </div>
      )}

      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* The person: found here, or being searched for. */}
        <fieldset className="space-y-4 min-w-0">
          {!isFound && <legend className="text-sm font-semibold text-navy-muted mb-3">The missing person</legend>}
          <TextField id="person-name" label="Name" value={name} onChange={setName} unsure={unsure('name')} />

          <div>
            <FieldLabel label="Gender" unsure={unsure('gender')} />
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'other'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gender === g}
                  onClick={() => setGender(gender === g ? 'unknown' : g)}
                  className={`${chipClass(gender === g, unsure('gender'))} capitalize`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel label="Age band" unsure={unsure('age_band')} />
            <div className="grid grid-cols-4 gap-2">
              {(['Under 12', '12–18', '19–59', '60+'] as const).map(a => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={ageBand === a}
                  onClick={() => setAgeBand(ageBand === a ? null : a)}
                  className={`${chipClass(ageBand === a, unsure('age_band'))} px-1 text-sm`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <TextField id="person-village" label="Village" value={village} onChange={setVillage} unsure={unsure('village')} />

          <div>
            <FieldLabel htmlFor="clothing-marks" label="Clothing or marks" unsure={unsure('clothing_or_marks')} />
            <textarea
              id="clothing-marks"
              rows={2}
              value={clothingMarks}
              onChange={e => setClothingMarks(e.target.value)}
              className={`${inputClass(unsure('clothing_or_marks'))} h-auto py-3 resize-none`}
            />
          </div>

          <PhotoPicker value={photo} onChange={setPhoto} />
        </fieldset>

        {/* Family and circumstances. */}
        <fieldset className="space-y-4 min-w-0">
          {!isFound && (
            <legend className="text-sm font-semibold text-navy-muted mb-3 lg:mt-0 mt-2">{family ? 'About you' : 'The person searching'}</legend>
          )}
          <TextField
            id="relative-name"
            label={isFound ? "Father's or spouse's name" : family ? 'Your name' : 'Name of the person searching'}
            value={relativeName}
            onChange={setRelativeName}
            unsure={unsure('relative_name')}
            required={family}
          />

          <div>
            <FieldLabel
              htmlFor="relative-relation"
              label={isFound ? 'Their relation (father, husband…)' : family ? 'You are their…' : 'Their relation to the missing person'}
              unsure={unsure('relative_relation')}
            />
            <RelationSelect
              id="relative-relation"
              value={relativeRelation}
              onChange={setRelativeRelation}
              required={family}
              className={unsure('relative_relation') ? 'input-unsure' : ''}
            />
          </div>

          {!isFound && (
            <div>
              <label htmlFor="contact-phone" className="field-label">
                {family ? 'Your phone number' : 'Contact phone (optional)'}
              </label>
              <input
                id="contact-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required={family}
                pattern={family ? '[0-9+ ()-]{6,}' : undefined}
                title="At least 6 digits"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="input"
              />
              {family && <p className="text-sm text-navy-muted mt-1">Staff use it to reach you when there is news.</p>}
            </div>
          )}

          <TextField
            id="found-where"
            label={isFound ? 'Where they were found' : 'Where they were last seen'}
            value={foundWhere}
            onChange={setFoundWhere}
            unsure={isFound && unsure('found_where')}
          />

          {isFound && (
            <div>
              <label htmlFor="private-detail" className="field-label">
                Private detail (not shown to searchers)
              </label>
              <input
                id="private-detail"
                type="text"
                value={privateDetail}
                onChange={e => setPrivateDetail(e.target.value)}
                className="input"
                autoComplete="off"
              />
              <p className="text-sm text-navy-muted mt-1">For example a scar, a birthmark, or what was in their pocket. Used to check the family's answer.</p>
            </div>
          )}

          {isFound && (
            <div className="card">
              <p className="text-sm font-medium text-navy mb-2">Is anyone from their family missing?</p>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map(v => (
                  <button
                    key={String(v)}
                    type="button"
                    aria-pressed={hasMissingFamily === v}
                    onClick={() => setHasMissingFamily(v)}
                    className={chipClass(hasMissingFamily === v, false)}
                  >
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isFound && hasMissingFamily && (
            <div>
              <FieldLabel label="Looking for" unsure={unsure('looking_for')} />
              <div className="space-y-2">
                {lookingFor.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      aria-label={`Relation ${i + 1}`}
                      placeholder="Relation"
                      value={p.relation}
                      onChange={e => updateLookingFor(i, { relation: e.target.value })}
                      className={inputClass(unsure('looking_for'))}
                    />
                    <input
                      aria-label={`Name ${i + 1}`}
                      placeholder="Name"
                      value={p.name ?? ''}
                      onChange={e => updateLookingFor(i, { name: e.target.value })}
                      className={inputClass(unsure('looking_for'))}
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLookingFor(prev => [...prev, { relation: '', name: '' }])}
                className="btn-text -ml-2"
              >
                Add a person
              </button>
            </div>
          )}
        </fieldset>
      </div>
    </form>
  );
};
