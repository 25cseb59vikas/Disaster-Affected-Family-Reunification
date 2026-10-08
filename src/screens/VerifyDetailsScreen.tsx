import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { Camera, AlertCircle, Check } from 'lucide-react';

export const VerifyDetailsScreen: React.FC = () => {
  const { navigateTo, registrationType, voiceDraft, saveNewPerson } = useApp();

  const [name, setName] = useState(voiceDraft.name || 'Murugan');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(voiceDraft.gender || 'Male');
  const [ageBand, setAgeBand] = useState<'Under 12' | '12–18' | '19–59' | '60+'>(voiceDraft.ageBand || '19–59');
  const [village, setVillage] = useState(voiceDraft.village || 'Kilvelur');
  const [relativeName, setRelativeName] = useState(voiceDraft.relativeName || 'Ramasamy');
  const [clothingMarks, setClothingMarks] = useState(voiceDraft.clothingMarks || 'Blue shirt, black pants, scar on left eyebrow');
  const [hasMissingFamily, setHasMissingFamily] = useState(voiceDraft.hasMissingFamily ?? false);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await saveNewPerson({
      name,
      gender,
      ageBand,
      approxAge: ageBand === '19–59' ? 35 : ageBand === 'Under 12' ? 8 : 65,
      village,
      relativeName,
      clothingMarks,
      hasMissingFamily,
      transcriptSnippet: voiceDraft.transcript,
      photoUrl: photoAdded ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=60' : undefined
    });
    setIsSaving(false);
    // As per prototypeSpec, saving takes user to Suggested Matches (Screen 5)
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

          {/* Transcript Box */}
          {voiceDraft.transcript && (
            <div className="p-4 rounded-card bg-[#EFECE6] border border-[#DDD8CF] text-[18px] text-navy leading-relaxed">
              <span className="font-semibold text-navy-muted">Transcript: </span>
              {voiceDraft.transcript.replace('Transcript: ', '')}
            </div>
          )}

          {/* Form fields in single column */}
          <div className="space-y-6 text-left">
            {/* Field: Name */}
            <div>
              <label htmlFor="person-name" className="block text-[18px] font-semibold text-navy mb-2">
                Name
              </label>
              <input
                id="person-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[52px] px-4 text-[20px] font-medium text-navy bg-surface border border-borderSlate rounded-input focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            {/* Field: Gender */}
            <div>
              <span className="block text-[18px] font-semibold text-navy mb-2">
                Gender
              </span>
              <div className="grid grid-cols-3 gap-3">
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-bold transition-all cursor-pointer border ${
                      gender === g
                        ? 'bg-navy text-white border-navy shadow-sm'
                        : 'bg-surface text-navy border-borderSlate hover:border-navy'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Field: Age band */}
            <div>
              <span className="block text-[18px] font-semibold text-navy mb-2">
                Age band
              </span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['Under 12', '12–18', '19–59', '60+'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAgeBand(a)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-semibold transition-all cursor-pointer border ${
                      ageBand === a
                        ? 'bg-navy text-white border-navy shadow-sm'
                        : 'bg-surface text-navy border-borderSlate hover:border-navy'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Field: Village */}
            <div>
              <label htmlFor="person-village" className="block text-[18px] font-semibold text-navy mb-2">
                Village
              </label>
              <input
                id="person-village"
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full h-[52px] px-4 text-[20px] font-medium text-navy bg-surface border border-borderSlate rounded-input focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            {/* Field: Father's or spouse's name (Unsure warning indicator as specified) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="relative-name" className="text-[18px] font-semibold text-navy">
                  Father's or spouse's name
                </label>
                <div className="flex items-center gap-1.5 text-pending text-[18px] font-bold bg-pending-bg px-2.5 py-0.5 rounded border border-pending-border">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                  <span>Please check</span>
                </div>
              </div>
              <input
                id="relative-name"
                type="text"
                value={relativeName}
                onChange={(e) => setRelativeName(e.target.value)}
                className="w-full h-[52px] px-4 text-[20px] font-medium text-navy bg-surface border-2 border-pending rounded-input focus:outline-none focus:ring-2 focus:ring-pending"
              />
            </div>

            {/* Field: Clothing or marks */}
            <div>
              <label htmlFor="clothing-marks" className="block text-[18px] font-semibold text-navy mb-2">
                Clothing or marks
              </label>
              <input
                id="clothing-marks"
                type="text"
                value={clothingMarks}
                onChange={(e) => setClothingMarks(e.target.value)}
                className="w-full h-[52px] px-4 text-[20px] font-medium text-navy bg-surface border border-borderSlate rounded-input focus:outline-none focus:ring-2 focus:ring-navy"
              />
            </div>

            {/* Large photo button */}
            <div>
              <button
                type="button"
                onClick={() => setPhotoAdded(!photoAdded)}
                className={`w-full h-14 min-h-[56px] rounded-input border-2 border-dashed flex items-center justify-center gap-3 text-[18px] font-bold transition-all cursor-pointer ${
                  photoAdded
                    ? 'border-verified bg-verified-bg text-verified'
                    : 'border-borderSlate bg-surface hover:border-navy text-navy'
                }`}
              >
                {photoAdded ? (
                  <>
                    <Check className="w-6 h-6 stroke-[2.5]" />
                    <span>Photo attached (Camp Camera)</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-6 h-6 stroke-[2]" />
                    <span>Add photo</span>
                  </>
                )}
              </button>
            </div>

            {/* Extra Question for Person found here */}
            {registrationType === 'found' && (
              <div className="p-5 rounded-card bg-surface border border-borderSlate space-y-3">
                <span className="block text-[18px] font-semibold text-navy">
                  Is anyone from their family missing?
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasMissingFamily(true)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-bold border cursor-pointer ${
                      hasMissingFamily
                        ? 'bg-navy text-white border-navy'
                        : 'bg-canvas text-navy border-borderSlate'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasMissingFamily(false)}
                    className={`h-12 min-h-[48px] rounded-input text-[18px] font-bold border cursor-pointer ${
                      !hasMissingFamily
                        ? 'bg-navy text-white border-navy'
                        : 'bg-canvas text-navy border-borderSlate'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Fixed bottom save button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-canvas/95 backdrop-blur-sm border-t border-borderSlate max-w-lg mx-auto z-20">
        <button
          type="button"
          id="saveButton"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[18px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center cursor-pointer"
        >
          {isSaving ? 'Saving to offline database...' : 'Save'}
        </button>
      </div>
    </div>
  );
};
