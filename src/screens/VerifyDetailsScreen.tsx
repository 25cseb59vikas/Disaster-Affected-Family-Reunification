import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
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

const inputClass = (unsure: boolean) =>
  `w-full h-[52px] px-4 text-[20px] font-medium text-navy bg-surface rounded-input focus:outline-none focus:ring-2 ${
    unsure ? 'border-2 border-pending focus:ring-pending' : 'border border-borderSlate focus:ring-navy'
  }`;

const PleaseCheck: React.FC = () => (
  <span className="text-pending text-[16px] font-bold bg-pending-bg px-2 py-0.5 rounded border border-pending-border">
    Please check
  </span>
);

const FieldLabel: React.FC<{ htmlFor?: string; label: string; unsure: boolean }> = ({ htmlFor, label, unsure }) => (
  <div className="flex items-center justify-between gap-2 mb-2">
    <label htmlFor={htmlFor} className="text-[18px] font-semibold text-navy">{label}</label>
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
    await saveNewPerson({
      name,
      gender,
      ageBand,
      village,
      relativeName,
      relativeRelation: relativeRelation || undefined,
      clothingMarks,
      foundWhere: foundWhere || undefined,
      lookingFor: lookingFor
        .filter(p => p.relation.trim() || p.name?.trim())
        .map(p => ({ relation: p.relation.trim(), name: p.name?.trim() || null })),
      hasMissingFamily,
      transcript: voiceDraft.transcript || undefined,
      photoUrl
    });
    setIsSaving(false);
    navigateTo('suggested_matches');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto pb-32">
      <div>
        <TopBar showBack={true} backTitle="Verify Details" />

        <main className="p-6 pt-6 space-y-6">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left">
            Check the details
          </h1>

          {voiceDraft.notice && (
            <p role="alert" className="p-4 rounded-card bg-pending-bg border border-pending-border text-[18px] font-semibold text-navy">
              {voiceDraft.notice}
            </p>
          )}

          {voiceDraft.transcript && (
            <div className="p-4 rounded-card bg-[#EFECE6] border border-[#DDD8CF] text-[18px] text-navy leading-relaxed">
              <span className="font-semibold text-navy-muted">What was heard: </span>
              {voiceDraft.transcript}
            </div>
          )}

          <div className="space-y-6 text-left">
            <TextField id="person-name" label="Name" value={name} onChange={setName} unsure={unsure('name')} />

            <div>
              <FieldLabel label="Gender" unsure={unsure('gender')} />
              <div className="grid grid-cols-3 gap-3">
                {(['Male', 'Female', 'Other'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={gender === g}
                    onClick={() => setGender(gender === g ? 'Unknown' : g)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-bold transition-colors cursor-pointer ${
                      gender === g
                        ? 'bg-navy text-white border border-navy'
                        : `bg-surface text-navy hover:border-navy ${unsure('gender') ? 'border-2 border-pending' : 'border border-borderSlate'}`
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel label="Age band" unsure={unsure('age_band')} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['Under 12', '12–18', '19–59', '60+'] as const).map(a => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={ageBand === a}
                    onClick={() => setAgeBand(ageBand === a ? null : a)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-semibold transition-colors cursor-pointer ${
                      ageBand === a
                        ? 'bg-navy text-white border border-navy'
                        : `bg-surface text-navy hover:border-navy ${unsure('age_band') ? 'border-2 border-pending' : 'border border-borderSlate'}`
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <TextField id="person-village" label="Village" value={village} onChange={setVillage} unsure={unsure('village')} />

            <TextField
              id="relative-name"
              label="Father's or spouse's name"
              value={relativeName}
              onChange={setRelativeName}
              unsure={unsure('relative_name')}
            />

            <TextField
              id="relative-relation"
              label="Their relation (father, husband…)"
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
                <div className="flex items-center gap-4">
                  <img src={photoUrl} alt="Photo of this person" className="w-24 h-24 rounded-input object-cover border border-borderSlate" />
                  <div className="flex flex-col items-start">
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="text-[18px] text-civilBlue hover:underline min-h-[48px] cursor-pointer">
                      Change photo
                    </button>
                    <button type="button" onClick={() => setPhotoUrl(undefined)} className="text-[18px] text-civilBlue hover:underline min-h-[48px] cursor-pointer">
                      Remove photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full h-14 min-h-[56px] rounded-input border-2 border-dashed border-borderSlate bg-surface hover:border-navy text-navy flex items-center justify-center gap-3 text-[18px] font-bold cursor-pointer"
                >
                  <Camera className="w-6 h-6 stroke-[2]" />
                  <span>Add photo</span>
                </button>
              )}
              {photoError && <p className="text-[16px] text-urgent mt-2">{photoError}</p>}
            </div>

            {registrationType === 'found' && (
              <div className="p-5 rounded-card bg-surface border border-borderSlate space-y-3">
                <span className="block text-[18px] font-semibold text-navy">
                  Is anyone from their family missing?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {[true, false].map(v => (
                    <button
                      key={String(v)}
                      type="button"
                      aria-pressed={hasMissingFamily === v}
                      onClick={() => setHasMissingFamily(v)}
                      className={`h-12 min-h-[48px] rounded-input text-[18px] font-bold border cursor-pointer ${
                        hasMissingFamily === v ? 'bg-navy text-white border-navy' : 'bg-canvas text-navy border-borderSlate'
                      }`}
                    >
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(registrationType === 'missing' || hasMissingFamily) && (
              <div className="space-y-3">
                <FieldLabel label="Looking for" unsure={unsure('looking_for')} />
                {lookingFor.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
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
                <button
                  type="button"
                  onClick={() => setLookingFor(prev => [...prev, { relation: '', name: '' }])}
                  className="text-[18px] text-civilBlue hover:underline min-h-[48px] cursor-pointer"
                >
                  Add a person
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-canvas border-t border-borderSlate max-w-lg mx-auto z-20">
        <button
          type="button"
          id="saveButton"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[18px] font-bold rounded-input transition-colors flex items-center justify-center cursor-pointer"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};
