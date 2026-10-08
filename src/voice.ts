import type { VoiceDraft } from './context/AppContext';
import { emptyDraft } from './context/AppContext';
import type { AgeBand, LookingFor, RecordType } from './types';

// Served through the Vite proxy (see vite.config.ts) so it works on localhost and over HTTPS.
const API = '/api';

export const VOICE_UNAVAILABLE = 'Voice is not available. Please type.';

interface ExtractResponse {
  transcript: string;
  fields: {
    name: string | null;
    gender: 'male' | 'female' | 'unknown';
    age_band: AgeBand | null;
    village: string | null;
    relative_name: string | null;
    relative_relation: string | null;
    clothing_or_marks: string | null;
    found_where: string | null;
    looking_for: LookingFor[];
  };
  unsure: string[];
}

export async function extractFromVoice(audio: Blob, type: RecordType): Promise<VoiceDraft> {
  const form = new FormData();
  form.append('audio', audio, 'clip.webm');
  form.append('record_type', type);

  try {
    const res = await fetch(`${API}/voice/extract`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: ExtractResponse = await res.json();
    const f = data.fields;
    return {
      ...emptyDraft,
      transcript: data.transcript,
      name: f.name ?? '',
      gender: f.gender ?? 'unknown',
      ageBand: f.age_band,
      village: f.village ?? '',
      relativeName: f.relative_name ?? '',
      relativeRelation: f.relative_relation ?? '',
      clothingMarks: f.clothing_or_marks ?? '',
      foundWhere: f.found_where ?? '',
      lookingFor: f.looking_for ?? [],
      unsure: data.unsure ?? []
    };
  } catch (err) {
    console.warn('Voice extraction failed', err);
    return { ...emptyDraft, notice: VOICE_UNAVAILABLE };
  }
}
