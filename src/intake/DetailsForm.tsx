import React, { useState } from 'react';
import { Mic, Sparkles, Square } from 'lucide-react';
import type { VoiceDraft } from '../context/AppContext';
import type { NewPerson } from '../records';
import type { AgeBand, Gender, LookingFor, RecordType } from '../types';
import { describePhoto, DESCRIBE_FAILED } from './describe';
import { PhotoPicker } from './PhotoPicker';
import { RelationSelect } from './RelationSelect';
import { formatTimer, MAX_SECONDS, useVoiceRecorder } from './VoiceCapture';

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

const GroupHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-sm font-semibold text-navy-muted lg:col-span-2">{children}</h2>
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

/**
 * Check and complete the details of a new record (after voice, a photo, or typed from scratch).
 * Phones: one column with the photo at the top. Desktop: photo, voice and transcript on the left,
 * the fields in a two-column grid on the right.
 */
export const DetailsForm: React.FC<DetailsFormProps> = ({ formId, type, draft, variant = 'site', onSave }) => {
  const family = variant === 'family';
  const isFound = type === 'found';

  const [unsureFields, setUnsureFields] = useState<string[]>(draft.unsure);
  const unsure = (field: string) => unsureFields.includes(field);
  const [notice, setNotice] = useState(draft.notice);
  const [transcript, setTranscript] = useState(draft.transcript);

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
  const [photo, setPhoto] = useState<string | null>(draft.photo);
  const [photoLarge, setPhotoLarge] = useState<string | null>(draft.photoLarge);
  const [describing, setDescribing] = useState(false);
  const [describeNote, setDescribeNote] = useState('');
  const [clothingFromPhoto, setClothingFromPhoto] = useState(draft.clothingFromPhoto);

  // Clothing and belongings described by the local vision model; the volunteer checks it (shown as "Please check").
  const describe = async () => {
    setDescribing(true);
    setDescribeNote('');
    const description = await describePhoto(photoLarge ?? photo!);
    if (description) {
      setClothingMarks(prev => (prev.trim() ? `${prev.trim()}; ${description}` : description));
      setClothingFromPhoto(true);
      setUnsureFields(prev => [...new Set([...prev, 'clothing_or_marks'])]);
    } else {
      setDescribeNote(DESCRIBE_FAILED);
    }
    setDescribing(false);
  };

  /**
   * Spoken details added after a photo (or a first recording): voice fills the fields it heard.
   * Clothing from the photo stays; if voice also described clothing, both are kept.
   */
  const addVoice = (d: VoiceDraft) => {
    if (d.notice) setNotice(d.notice);
    if (!d.transcript) return;
    const filled: string[] = [];
    const take = (field: string, value: string, set: (v: string) => void) => {
      if (value.trim()) {
        set(value);
        filled.push(field);
      }
    };
    take('name', d.name, setName);
    take('village', d.village, setVillage);
    take('relative_name', d.relativeName, setRelativeName);
    take('relative_relation', d.relativeRelation, setRelativeRelation);
    take('found_where', d.foundWhere, setFoundWhere);
    if (d.clothingMarks.trim()) {
      setClothingMarks(prev => (prev.trim() && prev.trim() !== d.clothingMarks.trim() ? `${d.clothingMarks.trim()}; ${prev.trim()}` : d.clothingMarks));
      filled.push('clothing_or_marks');
    }
    if (d.gender !== 'unknown') {
      setGender(d.gender);
      filled.push('gender');
    }
    if (d.ageBand) {
      setAgeBand(d.ageBand);
      filled.push('age_band');
    }
    if (d.lookingFor.length) {
      setLookingFor(d.lookingFor);
      setHasMissingFamily(true);
      filled.push('looking_for');
    }
    setTranscript(prev => (prev ? `${prev} ${d.transcript}` : d.transcript));
    // A field voice filled takes voice's "please check"; clothing from the photo stays flagged.
    setUnsureFields(prev => [
      ...new Set([
        ...prev.filter(f => !filled.includes(f) || (f === 'clothing_or_marks' && clothingFromPhoto)),
        ...d.unsure.filter(f => filled.includes(f))
      ])
    ]);
    setNotice('');
  };
  const voice = useVoiceRecorder(type, addVoice);

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
      transcript: transcript || null,
      photo
    });
  };

  const clothingUnsure = unsure('clothing_or_marks') || clothingFromPhoto;

  return (
    <form id={formId} onSubmit={submit} className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-8 lg:items-start">
      {/* Left on desktop, top on phones: notice, photo, voice, what was heard. */}
      <div className="space-y-4 mb-4 lg:mb-0 lg:sticky lg:top-0">
        {notice && (
          <p role="alert" className="card bg-pending-bg border-pending-border text-base font-medium text-navy">
            {notice}
          </p>
        )}

        <section aria-label="Photo" className="card p-3">
          <PhotoPicker
            value={photo}
            onChange={(thumbnail, large) => {
              setPhoto(thumbnail);
              setPhotoLarge(large);
              setDescribeNote('');
            }}
          />
          {photo && (
            <button type="button" onClick={describe} disabled={describing} className="btn-text -ml-2 gap-1.5 disabled:cursor-wait">
              <Sparkles className="w-5 h-5" strokeWidth={1.75} />
              {describing ? 'Looking at the photo…' : 'Describe clothing from the photo'}
            </button>
          )}
          {describeNote && <p className="text-sm text-urgent">{describeNote}</p>}
        </section>

        <section aria-label="Add details by voice" className="card p-3 flex items-center gap-3">
          <button
            type="button"
            onClick={voice.toggle}
            disabled={voice.phase === 'understanding'}
            aria-label={voice.phase === 'recording' ? 'Stop recording' : 'Speak to add details'}
            className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-60 disabled:cursor-wait ${
              voice.phase === 'recording' ? 'bg-urgent' : 'bg-terracotta hover:bg-terracotta-hover'
            }`}
          >
            {voice.phase === 'recording' ? <Square className="w-5 h-5 fill-white" strokeWidth={1.75} /> : <Mic className="w-6 h-6" strokeWidth={1.75} />}
          </button>
          <span className="min-w-0" aria-live="polite">
            <span className="block text-base font-medium text-navy">
              {voice.phase === 'recording' ? 'Listening…' : voice.phase === 'understanding' ? 'Understanding…' : 'Speak to add details'}
            </span>
            <span className="block text-sm text-navy-muted">
              {voice.phase === 'recording'
                ? `${formatTimer(voice.seconds)} of ${formatTimer(MAX_SECONDS)} · Tap to stop`
                : 'Fills the fields it hears; nothing you typed is cleared.'}
            </span>
          </span>
        </section>

        {transcript && (
          <div className="p-3 rounded-card bg-pressed text-sm text-navy">
            <span className="font-medium text-navy-muted">What was heard: </span>
            {transcript}
          </div>
        )}
      </div>

      {/* The fields: one column on phones, a two-column grid on desktop. */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-6 min-w-0">
        {!isFound && <GroupHeading>The missing person</GroupHeading>}
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

        <div className="lg:col-span-2">
          <FieldLabel htmlFor="clothing-marks" label="Clothing or marks" unsure={clothingUnsure} />
          <textarea
            id="clothing-marks"
            rows={clothingFromPhoto ? 4 : 2}
            value={clothingMarks}
            onChange={e => setClothingMarks(e.target.value)}
            className={`${inputClass(clothingUnsure)} h-auto py-3 resize-none`}
          />
          {clothingFromPhoto && <p className="text-sm text-navy-muted mt-1">Described from the photo by the local AI. Check it against the person.</p>}
        </div>

        {!isFound && <GroupHeading>{family ? 'About you' : 'The person searching'}</GroupHeading>}
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
          <div className="card lg:col-span-2">
            <p className="text-sm font-medium text-navy mb-2">Is anyone from their family missing?</p>
            <div className="grid grid-cols-2 gap-2 lg:max-w-sm">
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
          <div className="lg:col-span-2">
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
            <button type="button" onClick={() => setLookingFor(prev => [...prev, { relation: '', name: '' }])} className="btn-text -ml-2">
              Add a person
            </button>
          </div>
        )}
      </div>
    </form>
  );
};
