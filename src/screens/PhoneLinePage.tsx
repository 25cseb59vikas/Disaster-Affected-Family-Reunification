import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Mic, Phone, PhoneOff } from 'lucide-react';
import { Screen } from '../components/Screen';
import { siteDb } from '../db/database';
import { PHONE_LINE, recordCode, siteName, uuid } from '../sites';
import { serverHealth, syncOnce } from '../sync';
import { eventsByPair, recordStatus } from '../matchStatus';
import type { AgeBand, Gender, PersonRecord } from '../types';

// A demonstration only: no real calls or text messages are made or sent.
const QUESTIONS = [
  { label: 'Looking for', text: 'Who are you looking for? Say their name.' },
  { label: 'Age', text: 'How old are they?' },
  { label: 'Boy, girl, man or woman', text: 'Is it a boy, girl, man or woman?' },
  { label: 'Village', text: 'Which village are they from?' },
  { label: 'Clothing or marks', text: 'What were they wearing, or any marks?' },
  { label: 'Last seen', text: 'Where did you last see them?' },
  { label: 'Caller name and relation', text: 'What is your name and your relation to them?' }
];
const MAX_ANSWER_MS = 12000;
const SILENCE_MS = 1500;

interface Fields {
  name: string | null;
  gender: 'male' | 'female' | 'unknown';
  age_band: AgeBand | null;
  village: string | null;
  relative_name: string | null;
  relative_relation: string | null;
  clothing_or_marks: string | null;
  found_where: string | null;
}

type Phase = 'idle' | 'asking' | 'listening' | 'understanding' | 'confirm' | 'saving' | 'ended' | 'error';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Speaks a sentence; resolves when done (or after a time limit, since some browsers never fire onend). */
function say(text: string): Promise<void> {
  if (!canSpeak) return Promise.resolve();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    u.rate = 0.95;
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, 2000 + text.length * 90);
    u.onend = done;
    u.onerror = done;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

const spokenBand: Record<AgeBand, string> = {
  'Under 12': 'under 12 years old',
  '12–18': 'aged 12 to 18',
  '19–59': 'aged 19 to 59',
  '60+': 'aged 60 or over'
};
const spellCode = (code: string) => code.replace('-', '').split('').join(', ');

export const PhoneLinePage: React.FC = () => {
  const db = siteDb(PHONE_LINE.id);
  const [phase, setPhase] = useState<Phase>('idle');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [fields, setFields] = useState<Fields | null>(null);
  const [message, setMessage] = useState('');
  const [recordId, setRecordId] = useState<string | null>(() => sessionStorage.getItem('reunite.phoneRecord'));
  const stopRef = useRef<((text?: string) => void) | null>(null);
  const endedRef = useRef(false);

  // Keep the phone line's copy of the data fresh, so the SMS preview follows the match.
  useEffect(() => {
    const tick = async () => {
      if (await serverHealth()) await syncOnce(db, PHONE_LINE.id).catch(() => {});
    };
    tick();
    const t = window.setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [db]);

  /** Records one answer. Stops after a pause in speech, at the time limit, on "Next", or when an answer is typed. */
  // "Next" and typed answers work at once, even while the microphone permission is still being asked
  // or if there is no microphone at all.
  const listen = (): Promise<{ blob?: Blob; text?: string }> =>
    new Promise(resolve => {
      let done = false;
      let stopRecording: ((text?: string) => void) | null = null;
      const answerTyped = (text?: string) => {
        if (done) return;
        if (stopRecording) return stopRecording(text);
        done = true;
        resolve({ text: text ?? '' });
      };
      stopRef.current = answerTyped;

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          if (done) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];
          recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
          const ctx = new AudioContext();
          const analyser = ctx.createAnalyser();
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.fftSize);
          let typedText: string | undefined;
          let heard = false;
          let quietSince = 0;
          const started = performance.now();
          const poll = window.setInterval(() => {
            analyser.getByteTimeDomainData(buf);
            const rms = Math.sqrt(buf.reduce((a, v) => a + (v - 128) ** 2, 0) / buf.length) / 128;
            const now = performance.now();
            if (rms > 0.04) {
              heard = true;
              quietSince = now;
            }
            if ((heard && now - quietSince > SILENCE_MS) || now - started > MAX_ANSWER_MS) stopRecording?.();
          }, 100);
          stopRecording = text => {
            typedText = text;
            clearInterval(poll);
            if (recorder.state === 'recording') recorder.stop();
          };
          recorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            ctx.close();
            done = true;
            resolve(typedText !== undefined ? { text: typedText } : { blob: new Blob(chunks, { type: recorder.mimeType }) });
          };
          recorder.start();
        })
        .catch(() => {
          /* no microphone: the typed answer or "Next" ends this question */
        });
    });

  const transcribe = async (blob: Blob): Promise<string> => {
    const form = new FormData();
    form.append('audio', blob, 'answer.webm');
    form.append('record_type', 'seeking');
    try {
      const res = await fetch('/api/voice/extract', { method: 'POST', body: form });
      return res.ok ? ((await res.json()).transcript as string) : '';
    } catch {
      return '';
    }
  };

  const runCall = async () => {
    endedRef.current = false;
    setFields(null);
    setRecordId(null);
    sessionStorage.removeItem('reunite.phoneRecord');
    const pending: Array<Promise<string>> = [];
    const shown: string[] = [];
    setAnswers([]);
    await say('Hello. This is the family search line. I will ask seven short questions. Please answer after each one.');
    for (let i = 0; i < QUESTIONS.length; i++) {
      if (endedRef.current) return;
      setQIndex(i);
      setPhase('asking');
      await say(QUESTIONS[i].text);
      if (endedRef.current) return;
      setTyped('');
      setPhase('listening');
      const answer = await listen();
      stopRef.current = null;
      // Transcribe in the background while the next question is asked.
      const p = answer.text !== undefined ? Promise.resolve(answer.text) : transcribe(answer.blob!);
      pending.push(p);
      p.then(t => {
        shown[i] = t || '(not heard)';
        setAnswers([...shown]);
      });
    }
    setPhase('understanding');
    const texts = await Promise.all(pending);
    // One labelled note gives the field extraction full context.
    const note = QUESTIONS.map((q, i) => `${q.label}: ${texts[i] || 'not given'}.`).join(' ');
    try {
      const res = await fetch('/api/voice/extract_text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: note, record_type: 'seeking' })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const f = (await res.json()).fields as Fields;
      setFields(f);
      setPhase('confirm');
      const summary = `You are looking for ${f.name ?? 'a person whose name was not heard'}${f.age_band ? `, ${spokenBand[f.age_band]}` : ''}${
        f.village ? `, from ${f.village}` : ''
      }. Is that correct?`;
      setMessage(summary);
      await say(summary);
    } catch {
      setPhase('error');
      setMessage('The line could not understand the answers. Please try again or visit a help desk.');
      await say('Sorry, something went wrong. Please call again or visit a help desk.');
    }
  };

  const confirm = async () => {
    if (!fields) return;
    setPhase('saving');
    const gender: Gender = fields.gender;
    const record: PersonRecord = {
      id: uuid(),
      code: recordCode(PHONE_LINE.id),
      site: PHONE_LINE.id,
      type: 'seeking',
      source: 'phone',
      created_at: new Date().toISOString(),
      registered_by: 'Phone line (demo)',
      name: fields.name,
      gender,
      age_band: fields.age_band,
      village: fields.village,
      relative_name: fields.relative_name,
      relative_relation: fields.relative_relation,
      clothing_marks: fields.clothing_or_marks,
      found_where: null,
      last_seen: fields.found_where,
      household_id: null,
      has_missing_family: false,
      looking_for: [],
      transcript: QUESTIONS.map((q, i) => `${q.label}: ${answers[i] ?? ''}`).join(' | '),
      photo: null
    };
    await db.transaction('rw', db.records, db.outbox, async () => {
      await db.records.add(record);
      await db.outbox.add({ id: record.id, kind: 'record', payload: record });
    });
    sessionStorage.setItem('reunite.phoneRecord', record.id);
    setRecordId(record.id);
    syncOnce(db, PHONE_LINE.id).catch(() => {}); // stays in the outbox if the link is down
    setPhase('ended');
    const goodbye = `Thank you. We will send you a message when we have news. Your reference is ${spellCode(record.code)}.`;
    setMessage(`We will send you a message when we have news. Your reference is ${record.code}.`);
    await say(goodbye);
  };

  const hangUp = () => {
    endedRef.current = true;
    if (canSpeak) speechSynthesis.cancel();
    stopRef.current?.('');
    setPhase('idle');
  };

  // SMS preview: built only from the record's status; nothing about the found person until verified.
  const sms = useLiveQuery(async () => {
    if (!recordId) return [];
    const [r, suggestions, events, records] = await Promise.all([
      db.records.get(recordId),
      db.suggestions.toArray(),
      db.events.toArray(),
      db.records.toArray()
    ]);
    if (!r) return [];
    const { status, suggestion } = recordStatus(r.id, suggestions, eventsByPair(events));
    const out = [`Reunite (demo): We have registered your search. Your reference is ${r.code}.`];
    if (status !== 'Searching') out.push(`Reunite (demo): A possible match is being checked. Reference ${r.code}.`);
    if (status === 'Found' && suggestion) {
      const found = records.find(x => x.id === suggestion.found_id);
      out.push(`Reunite (demo): Found. Please go to the help desk at ${found ? siteName(found.site) : 'the site'}. Reference ${r.code}.`);
    }
    return out;
  }, [db, recordId]);

  const inCall = phase !== 'idle' && phase !== 'ended' && phase !== 'error';

  return (
    <Screen header={false}>
      <p className="-mx-4 -mt-4 mb-4 px-4 py-2 bg-pending-bg border-b border-pending-border text-sm font-semibold text-navy text-center">
        Simulated call – demo. No real phone call or SMS is made.
      </p>
      <h1 className="screen-title">Family search line</h1>

      <section className="card mb-3 text-center">
        {phase === 'idle' || phase === 'ended' || phase === 'error' ? (
          <>
            {message && <p className="text-lg font-semibold text-navy mb-3">{message}</p>}
            <button type="button" onClick={runCall} className="btn-primary">
              <Phone className="w-5 h-5" strokeWidth={1.75} />
              {phase === 'idle' ? 'Call' : 'Call again'}
            </button>
            {!canSpeak && <p className="text-sm text-navy-muted mt-2">Spoken questions are not available in this browser; read them on screen.</p>}
          </>
        ) : (
          <>
            {(phase === 'asking' || phase === 'listening') && (
              <>
                <p className="text-sm text-navy-muted">
                  Question {qIndex + 1} of {QUESTIONS.length}
                </p>
                <p className="text-xl font-semibold text-navy my-2" aria-live="polite">
                  {QUESTIONS[qIndex].text}
                </p>
                <p className={`flex items-center justify-center gap-2 text-base ${phase === 'listening' ? 'text-urgent font-medium' : 'text-navy-muted'}`}>
                  {phase === 'listening' && <Mic className="w-5 h-5" strokeWidth={1.75} />}
                  {phase === 'listening' ? 'Listening… answer now' : 'Speaking…'}
                </p>
                {phase === 'listening' && (
                  <div className="mt-3 text-left">
                    <label htmlFor="typed-answer" className="field-label">
                      Or type the answer
                    </label>
                    <input
                      id="typed-answer"
                      value={typed}
                      onChange={e => setTyped(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && stopRef.current?.(typed)}
                      className="input"
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => stopRef.current?.(typed.trim() ? typed : undefined)} className="btn-text w-full mt-1">
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
            {phase === 'understanding' && <p className="text-lg font-semibold text-navy">Checking your answers…</p>}
            {phase === 'confirm' && (
              <>
                <p className="text-lg font-semibold text-navy mb-3" aria-live="polite">
                  {message}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={confirm} className="btn-primary">
                    Yes
                  </button>
                  <button type="button" onClick={runCall} className="chip">
                    No, start again
                  </button>
                </div>
              </>
            )}
            {phase === 'saving' && <p className="text-lg font-semibold text-navy">Registering…</p>}
            <button type="button" onClick={hangUp} className="btn-text text-urgent mt-2 gap-1">
              <PhoneOff className="w-5 h-5" strokeWidth={1.75} />
              End call
            </button>
          </>
        )}
      </section>

      {answers.length > 0 && (inCall || phase === 'ended') && (
        <section className="card mb-3">
          <h2 className="text-sm font-medium text-navy-muted mb-1">What the line heard</h2>
          <dl className="space-y-1">
            {QUESTIONS.map((q, i) =>
              answers[i] ? (
                <div key={q.label} className="min-w-0">
                  <dt className="text-xs text-navy-muted">{q.label}</dt>
                  <dd className="text-sm text-navy break-words">{answers[i]}</dd>
                </div>
              ) : null
            )}
          </dl>
        </section>
      )}

      <section className="card">
        <h2 className="text-sm font-medium text-navy-muted">SMS preview (demo – not sent)</h2>
        {sms && sms.length ? (
          <ul className="mt-2 space-y-2">
            {sms.map(m => (
              <li key={m} className="rounded-card bg-pressed px-3 py-2 text-base text-navy">
                {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-navy-muted mt-1">Messages the caller would receive appear here after registering.</p>
        )}
      </section>
    </Screen>
  );
};
