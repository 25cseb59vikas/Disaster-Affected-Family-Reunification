import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { Camera } from 'lucide-react';
import type { AgeBand, Gender, LookingFor } from '../types';

const THUMBNAIL_PX = 240;

// Shrinks a picked image to a small JPEG data URL so it fits in IndexedDB and sync payloads.
function makeThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, THUMBNAIL_PX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });
}

const inputClass = (unsure: boolean) => `input ${unsure ? 'input-unsure' : ''}`;
const chipClass = (on: boolean, unsure: boolean) => `chip ${on ? 'chip-on' : unsure ? 'input-unsure' : ''}`;

const PleaseCheck: React.FC = () => (
  <span className="badge bg-pending-bg text-pending border-pending-border">Please check</span>
);

const FieldLabel: React.FC<{ htmlFor?: string; label: string; unsure: boolean }> = ({ htmlFor, label, unsure }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
    <label htmlFor={htmlFor} className="text-sm font-medium text-navy">{label}</label>
    {unsure && <PleaseCheck />}
  </div>
);

const TextField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unsure: boolean;
}> = ({ id, label, value, onChange, unsure }) => (
  <div>
    <FieldLabel htmlFor={id} label={label} unsure={unsure} />
    <input id={id} type="text" value={value} onChange={e => onChange(e.target.value)} className={inputClass(unsure)} />
  </div>
);

export const VerifyDetailsScreen: React.FC = () => {
  const { navigateTo, registrationType, voiceDraft, saveNewPerson } = useApp();
  const unsure = (field: string) => voiceDraft.unsure.includes(field);

  const [name, setName] = useState(voiceDraft.name);
  const [gender, setGender] = useState<Gender>(voiceDraft.gender);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(voiceDraft.ageBand);
  const [village, setVillage] = useState(voiceDraft.village);
  const [relativeName, setRelativeName] = useState(voiceDraft.relativeName);
  const [relativeRelation, setRelativeRelation] = useState(voiceDraft.relativeRelation);
  const [clothingMarks, setClothingMarks] = useState(voiceDraft.clothingMarks);
  const [foundWhere, setFoundWhere] = useState(voiceDraft.foundWhere);
  const [lookingFor, setLookingFor] = useState<LookingFor[]>(voiceDraft.lookingFor);
  const [hasMissingFamily, setHasMissingFamily] = useState(voiceDraft.lookingFor.length > 0);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhotoUrl(await makeThumbnail(file));
      setPhotoError('');
    } catch {
      setPhotoError('That photo could not be read. Please try another.');
    }
  };

  const updateLookingFor = (i: number, patch: Partial<LookingFor>) =>
    setLookingFor(prev => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const handleSave = async () => {
    setIsSaving(true);
    const isFound = registrationType === 'found';
    await saveNewPerson({
      name: name.trim() || null,
      gender,
      age_band: ageBand,
      village: village.trim() || null,
      relative_name: relativeName.trim() || null,
      relative_relation: relativeRelation.trim() || null,
      clothing_marks: clothingMarks.trim() || null,
      found_where: isFound ? foundWhere.trim() || null : null,
      household_id: null,
      has_missing_family: isFound && hasMissingFamily,
      looking_for:
        isFound && hasMissingFamily
          ? lookingFor
              .filter(p => p.relation.trim() || p.name?.trim())
              .map(p => ({ relation: p.relation.trim(), name: p.name?.trim() || null }))
          : [],
      transcript: voiceDraft.transcript || null,
      photo: photoUrl ?? null
    });
    setIsSaving(false);
    navigateTo('saved');
  };

  return (
    <Screen
      showBack
      footer={
        <button type="button" id="saveButton" onClick={handleSave} disabled={isSaving} className="btn-primary">
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <h1 className="screen-title">Check the details</h1>
      {registrationType === 'seeking' && (
        <p className="text-sm text-navy-muted -mt-2 mb-4">Name, age and clothing are about the missing person.</p>
      )}

      {voiceDraft.notice && (
        <p role="alert" className="card mb-4 bg-pending-bg border-pending-border text-base font-medium text-navy">
          {voiceDraft.notice}
        </p>
      )}

      {voiceDraft.transcript && (
        <div className="mb-4 p-3 rounded-card bg-pressed text-sm text-navy">
          <span className="font-medium text-navy-muted">What was heard: </span>
          {voiceDraft.transcript}
        </div>
      )}

      <div className="space-y-4">
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

        <TextField
          id="relative-name"
          label={registrationType === 'found' ? "Father's or spouse's name" : 'Name of the person searching'}
          value={relativeName}
          onChange={setRelativeName}
          unsure={unsure('relative_name')}
        />

        <TextField
          id="relative-relation"
          label={registrationType === 'found' ? 'Their relation (father, husband…)' : 'Their relation to the missing person'}
          value={relativeRelation}
          onChange={setRelativeRelation}
          unsure={unsure('relative_relation')}
        />

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

        {registrationType === 'found' && (
          <TextField
            id="found-where"
            label="Where they were found"
            value={foundWhere}
            onChange={setFoundWhere}
            unsure={unsure('found_where')}
          />
        )}

        <div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          {photoUrl ? (
            <div className="flex items-center gap-3">
              <img src={photoUrl} alt="Photo of this person" className="w-20 h-20 rounded-button object-cover border border-borderSlate" />
              <div className="flex flex-col items-start">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="btn-text">
                  Change photo
                </button>
                <button type="button" onClick={() => setPhotoUrl(undefined)} className="btn-text">
                  Remove photo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full h-12 rounded-button border border-dashed border-navy-muted/40 bg-surface hover:border-navy text-navy flex items-center justify-center gap-2 text-base font-medium cursor-pointer"
            >
              <Camera className="icon" />
              <span>Add photo</span>
            </button>
          )}
          {photoError && <p className="text-sm text-urgent mt-1.5">{photoError}</p>}
        </div>

        {registrationType === 'found' && (
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

        {registrationType === 'found' && hasMissingFamily && (
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
      </div>
    </Screen>
  );
};
