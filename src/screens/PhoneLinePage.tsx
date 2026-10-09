import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, HelpCircle, Keyboard, Loader2, Mic, Phone, PhoneOff, Volume2 } from 'lucide-react';
import { siteDb } from '../db/database';
import { PHONE_LINE, recordCode, siteName, uuid } from '../sites';
import { applyServerEpoch, serverHealth, syncOnce } from '../sync';
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

/** Every timing of the call in one place. */
export const CALL_CONFIG = {
  afterSpeechMs: 400, // pause between the end of a spoken question and opening the microphone
  speechFallbackBaseMs: 2500, // if speechSynthesis never fires "end": give up after base + per character
  speechFallbackPerCharMs: 110,
  calibrationMs: 500, // background noise measured at the start of each answer
  silenceMs: 2000, // automatic mode: silence after speech that ends an answer
  noisyGiveUpMs: 5000, // automatic mode: no silence detectable this long after calibration -> back to "Done"
  autoMaxAnswerMs: 30000, // automatic mode: longest answer, counted from the first speech
  maxRecordingMs: 60000, // "Done" mode: recording stops here and waits for Done
  meterEveryMs: 50
};

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

/**
 * One active state at a time. A question goes SPEAKING -> WAITING (microphone open, no speech yet) ->
 * LISTENING (speech heard) -> SUBMITTING -> the next question; TYPING replaces WAITING/LISTENING as soon as
 * the caller types. The read-back uses the same states with the confirm_ prefix.
 * Leaving a state cancels every timer, the recorder and the microphone that belonged to it.
 */
type CallState =
  | 'idle'
  | 'intro'
  | 'speaking'
  | 'waiting'
  | 'listening'
  | 'typing'
  | 'submitting'
  | 'understanding'
  | 'confirm_speaking'
  | 'confirm_waiting'
  | 'confirm_listening'
  | 'confirm_submitting'
  | 'confirm'
  | 'saving'
  | 'ended'
  | 'error';

const QUESTION_STATES: CallState[] = ['speaking', 'waiting', 'listening', 'typing', 'submitting'];
const MIC_STATES: CallState[] = ['waiting', 'listening', 'confirm_waiting', 'confirm_listening'];

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
const debugOn = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

const spokenBand: Record<AgeBand, string> = {
  'Under 12': 'under 12 years old',
  '12–18': 'aged 12 to 18',
  '19–59': 'aged 19 to 59',
  '60+': 'aged 60 or over'
};
const spellCode = (code: string) => code.replace('-', '').split('').join(', ');
const YES = /\b(yes|yeah|yep|correct|right|ok|okay|sure|haan|aam)\b/i;
const NO = /\b(no|nope|wrong|incorrect|not correct|not right|illai)\b/i;

const transcribe = async (blob: Blob): Promise<string> => {
  const form = new FormData();
  form.append('audio', blob, 'answer.webm');
  form.append('record_type', 'seeking');
  try {
    const res = await fetch('/api/voice/extract', { method: 'POST', body: form });
    return res.ok ? (((await res.json()).transcript as string) ?? '').trim() : '';
  } catch {
    return '';
  }
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Small ring that empties over the silence period; talking again cancels it. */
const CountdownRing: React.FC<{ leftMs: number }> = ({ leftMs }) => {
  const r = 14;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, leftMs / CALL_CONFIG.silenceMs));
  return (
    <span className="inline-flex items-center gap-2 text-sm text-navy-muted" aria-live="polite">
      <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="#C2540F"
          strokeWidth="4"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 18 18)"
        />
      </svg>
      Moving on in {(leftMs / 1000).toFixed(1)} s – keep talking to continue
    </span>
  );
};

const LevelMeter: React.FC<{ level: number; threshold: number | null }> = ({ level, threshold }) => {
  const scale = Math.max(0.1, (threshold ?? 0.05) * 4);
  return (
    <span className="relative block w-full max-w-xs h-2.5 mx-auto rounded-full bg-pressed overflow-hidden" aria-hidden>
      <span className="absolute inset-y-0 left-0 bg-verified transition-[width] duration-75" style={{ width: `${Math.min(100, (level / scale) * 100)}%` }} />
      {threshold !== null && <span className="absolute inset-y-0 w-0.5 bg-navy" style={{ left: `${Math.min(100, (threshold / scale) * 100)}%` }} />}
    </span>
  );
};

export const PhoneLinePage: React.FC = () => {
  const db = siteDb(PHONE_LINE.id);
  const [state, setState] = useState<CallState>('idle');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<string | undefined>>([]);
  const [typed, setTyped] = useState('');
  const [hint, setHint] = useState('');
  const [notice, setNotice] = useState('');
  const [fields, setFields] = useState<Fields | null>(null);
  const [message, setMessage] = useState('');
  const [recordId, setRecordId] = useState<string | null>(() => sessionStorage.getItem('reunite.phoneRecord'));
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [meter, setMeter] = useState({ level: 0, threshold: null as number | null, noise: null as number | null, silenceLeft: null as number | null });
  const [events, setEvents] = useState<string[]>([]);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [callEnd, setCallEnd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<'details' | 'sms'>('details');
  const questionRef = useRef<HTMLDivElement>(null);

  // The machine itself lives in refs so async steps always see the current values.
  const stateRef = useRef<CallState>('idle');
  const epochRef = useRef(0);
  const cleanupsRef = useRef<Array<() => void>>([]);
  const answersRef = useRef<Array<string | undefined>>([]);
  const qRef = useRef(0);
  const typedRef = useRef('');
  const fieldsRef = useRef<Fields | null>(null);
  const autoRef = useRef(false);
  const typedOnlyRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recRef = useRef<{ recorder: MediaRecorder; chunks: Blob[]; epoch: number } | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // held so it is not garbage-collected before "end"
  const inputRef = useRef<HTMLInputElement>(null);
  const focusInputRef = useRef(false); // focus the text box once it is drawn and enabled
  const t0Ref = useRef(performance.now());
  autoRef.current = autoAdvance;

  const log = (text: string) => {
    const line = `${((performance.now() - t0Ref.current) / 1000).toFixed(1)}s ${text}`;
    if (debugOn) console.info('[Reunite phone]', line);
    setEvents(prev => [...prev.slice(-9), line]);
  };

  /** The only way to change state: tears down everything the old state owned. Returns the new epoch. */
  const transition = (next: CallState, keepResources = false): number => {
    if (!keepResources) {
      cleanupsRef.current.splice(0).forEach(fn => {
        try {
          fn();
        } catch {
          /* already stopped */
        }
      });
      recRef.current = null;
      setMeter(m => ({ ...m, level: 0, silenceLeft: null }));
      epochRef.current++;
    }
    stateRef.current = next;
    setState(next);
    log(`→ ${next}${QUESTION_STATES.includes(next) ? ` (question ${qRef.current + 1})` : ''}`);
    return epochRef.current;
  };
  const alive = (epoch: number) => epoch === epochRef.current;
  const own = (fn: () => void) => cleanupsRef.current.push(fn);
  const wait = (epoch: number, ms: number) =>
    new Promise<boolean>(resolve => {
      const t = window.setTimeout(() => resolve(alive(epoch)), ms);
      own(() => {
        clearTimeout(t);
        resolve(false);
      });
    });

  /** Speaks and resolves after "end" (or a length-based fallback if "end" never fires), owned by the current state. */
  const speak = (text: string) =>
    new Promise<void>(resolve => {
      if (!canSpeak) return resolve();
      let finished = false;
      const done = (why: string) => {
        if (finished) return;
        finished = true;
        clearTimeout(fallback);
        clearInterval(poll);
        if (why !== 'end') log(`speech finished by ${why}`);
        resolve();
      };
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-IN';
      u.rate = 0.95;
      u.onend = () => done('end');
      u.onerror = () => done('error');
      utteranceRef.current = u;
      const fallback = window.setTimeout(() => done('timeout'), CALL_CONFIG.speechFallbackBaseMs + text.length * CALL_CONFIG.speechFallbackPerCharMs);
      // Some browsers stop speaking without firing "end": treat "no longer speaking" (after it started) as the end.
      let started = false;
      const poll = window.setInterval(() => {
        if (speechSynthesis.speaking) started = true;
        else if (started) done('poll');
      }, 250);
      own(() => {
        speechSynthesis.cancel();
        done('cancel');
      });
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });

  const setAnswer = (i: number, text: string) => {
    answersRef.current = [...answersRef.current];
    answersRef.current[i] = text;
    setAnswers(answersRef.current);
  };

  /** The next question still without an answer, after i first; -1 when all are answered. */
  const nextQuestion = (i: number) => {
    const order = [...QUESTIONS.keys()].filter(k => k > i).concat([...QUESTIONS.keys()].filter(k => k <= i));
    return order.find(k => answersRef.current[k] === undefined) ?? -1;
  };

  const askQuestion = async (i: number, prefix = '') => {
    qRef.current = i;
    setQIndex(i);
    typedRef.current = '';
    setTyped('');
    setHint('');
    if (prefix) focusInputRef.current = true;
    const e = transition('speaking');
    await speak(prefix + QUESTIONS[i].text);
    if (!alive(e) || !(await wait(e, CALL_CONFIG.afterSpeechMs))) return;
    if (typedOnlyRef.current || typedRef.current.trim()) {
      transition('typing');
      return;
    }
    openMic('question');
  };

  /** WAITING/LISTENING: microphone, recorder and level meter, all owned by this listening session. */
  const openMic = async (purpose: 'question' | 'confirm') => {
    const waitingState: CallState = purpose === 'question' ? 'waiting' : 'confirm_waiting';
    const listeningState: CallState = purpose === 'question' ? 'listening' : 'confirm_listening';
    const e = transition(waitingState);
    // Never open the microphone while the line is still talking.
    while (canSpeak && speechSynthesis.speaking) if (!(await wait(e, 100))) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      if (!alive(e)) return;
      typedOnlyRef.current = true;
      setNotice('The microphone is not available. Please type your answers for this call.');
      if (purpose === 'question') focusInputRef.current = true;
      transition(purpose === 'question' ? 'typing' : 'confirm');
      return;
    }
    if (!alive(e)) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }
    own(() => stream.getTracks().forEach(t => t.stop()));

    const ctx = audioCtxRef.current!;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    own(() => source.disconnect());

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
    recorder.start(250);
    own(() => {
      recorder.ondataavailable = null;
      if (recorder.state !== 'inactive') recorder.stop(); // leaving without submitting discards the audio
    });
    recRef.current = { recorder, chunks, epoch: e };
    log(`microphone open (${purpose})`);

    const buf = new Float32Array(analyser.fftSize);
    const started = performance.now();
    const samples: number[] = [];
    let threshold: number | null = null;
    let heardAt: number | null = null;
    let quietSince: number | null = null;
    let silenceSeen = false;
    let capped = false;
    const tick = window.setInterval(() => {
      if (!alive(e)) return;
      analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
      const now = performance.now();
      const t = now - started;

      if (threshold === null) {
        samples.push(rms);
        setMeter(m => ({ ...m, level: rms }));
        if (t < CALL_CONFIG.calibrationMs) return;
        const noise = median(samples);
        threshold = Math.min(0.25, Math.max(0.015, noise * 2.5 + 0.01));
        setMeter(m => ({ ...m, noise, threshold }));
        log(`calibrated: noise ${noise.toFixed(3)}, threshold ${threshold.toFixed(3)}`);
        return;
      }

      const voice = rms > threshold;
      if (voice) {
        quietSince = null;
        if (heardAt === null) {
          heardAt = now;
          transition(listeningState, true); // same session: recorder and timers carry on
        }
      } else {
        quietSince ??= now;
        if (now - quietSince >= 300) silenceSeen = true;
      }

      let silenceLeft: number | null = null;
      if (autoRef.current) {
        if (!silenceSeen && t - CALL_CONFIG.calibrationMs > CALL_CONFIG.noisyGiveUpMs) {
          autoRef.current = false;
          setAutoAdvance(false);
          setNotice('It is too noisy to hear when you stop talking. Tap "Done" when you have answered.');
          log('too noisy: automatic mode off');
        } else if (heardAt !== null && quietSince !== null) {
          silenceLeft = CALL_CONFIG.silenceMs - (now - quietSince);
          if (silenceLeft <= 0) return void submitVoice(purpose);
        }
        if (heardAt !== null && now - heardAt >= CALL_CONFIG.autoMaxAnswerMs) return void submitVoice(purpose);
      }
      if (!capped && t >= CALL_CONFIG.maxRecordingMs) {
        capped = true;
        if (recorder.state === 'recording') recorder.pause();
        setHint('Recording stopped at 60 seconds. Tap "Done".');
      }
      setMeter(m => ({ ...m, level: rms, silenceLeft }));
    }, CALL_CONFIG.meterEveryMs);
    own(() => clearInterval(tick));
  };

  /** Done (or automatic silence): collect the audio, then SUBMITTING. */
  const submitVoice = async (purpose: 'question' | 'confirm') => {
    const rec = recRef.current;
    if (!rec || !MIC_STATES.includes(stateRef.current)) return; // a second tap does nothing
    const { recorder, chunks } = rec;
    recRef.current = null;
    const blob = await new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      if (recorder.state === 'inactive') resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      else recorder.stop();
    });
    const e = transition(purpose === 'question' ? 'submitting' : 'confirm_submitting');
    const i = qRef.current;
    const text = await transcribe(blob);
    if (!alive(e)) return;
    log(`heard: "${text}"`);
    if (purpose === 'confirm') return handleYesNo(text);
    if (!text) {
      askQuestion(i, 'I did not catch that. ');
      return;
    }
    setAnswer(i, text);
    goOn(i);
  };

  const goOn = (i: number) => {
    const n = nextQuestion(i);
    if (n === -1) finish();
    else askQuestion(n);
  };

  const submitTyped = () => {
    if (!QUESTION_STATES.includes(stateRef.current) || stateRef.current === 'submitting') return;
    const text = typedRef.current.trim();
    if (!text) {
      setHint('Please type an answer or tap Skip.');
      inputRef.current?.focus();
      return;
    }
    transition('submitting');
    setAnswer(qRef.current, text);
    goOn(qRef.current);
  };

  const skip = () => {
    if (!QUESTION_STATES.includes(stateRef.current) || stateRef.current === 'submitting') return;
    transition('submitting');
    setAnswer(qRef.current, '');
    goOn(qRef.current);
  };

  const onType = (value: string) => {
    typedRef.current = value;
    setTyped(value);
    setHint('');
    // Typing takes over this question: stop listening and every silence timer.
    if (value.trim() && (stateRef.current === 'waiting' || stateRef.current === 'listening')) transition('typing');
  };

  const finish = async () => {
    const e = transition('understanding');
    const texts = answersRef.current.map(a => a ?? '');
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
      if (!alive(e)) return;
      fieldsRef.current = f;
      setFields(f);
      const summary = `You are looking for ${f.name ?? 'a person whose name was not heard'}${f.age_band ? `, ${spokenBand[f.age_band]}` : ''}${
        f.village ? `, from ${f.village}` : ''
      }. Is that correct?`;
      setMessage(summary);
      askConfirm(summary);
    } catch {
      if (!alive(e)) return;
      transition('error');
      setMessage('The line could not understand the answers. Please try again or visit a help desk.');
      await speak('Sorry, something went wrong. Please call again or visit a help desk.');
    }
  };

  /** The read-back waits for an explicit yes or no, by voice or button; it never times out into a yes. */
  const askConfirm = async (sentence: string) => {
    const e = transition('confirm_speaking');
    await speak(sentence);
    if (!alive(e) || !(await wait(e, CALL_CONFIG.afterSpeechMs))) return;
    if (typedOnlyRef.current) transition('confirm');
    else openMic('confirm');
  };

  const handleYesNo = (text: string) => {
    if (NO.test(text)) return answerNo();
    if (YES.test(text)) return confirm();
    askConfirm('Please say yes or no, or tap a button.');
  };

  const answerNo = () => {
    transition('confirm');
    setMessage('Tap "Edit" next to the answer to change, then the line reads the details back again.');
    speak('Please choose the answer to change.');
  };

  const confirm = async () => {
    const f = fieldsRef.current;
    if (!f) return;
    transition('saving');
    const gender: Gender = f.gender;
    const record: PersonRecord = {
      id: uuid(),
      code: recordCode(PHONE_LINE.id),
      site: PHONE_LINE.id,
      type: 'seeking',
      source: 'phone',
      created_at: new Date().toISOString(),
      registered_by: 'Phone line (demo)',
      name: f.name,
      gender,
      age_band: f.age_band,
      village: f.village,
      relative_name: f.relative_name,
      relative_relation: f.relative_relation,
      clothing_marks: f.clothing_or_marks,
      found_where: null,
      last_seen: f.found_where,
      household_id: null,
      has_missing_family: false,
      looking_for: [],
      transcript: QUESTIONS.map((q, i) => `${q.label}: ${answersRef.current[i] || '(skipped)'}`).join(' | '),
      photo: null
    };
    await db.transaction('rw', db.records, db.outbox, async () => {
      await db.records.add(record);
      await db.outbox.add({ id: record.id, kind: 'record', payload: record });
    });
    sessionStorage.setItem('reunite.phoneRecord', record.id);
    setRecordId(record.id);
    syncOnce(db, PHONE_LINE.id).catch(() => {}); // stays in the outbox if the link is down
    setSavedCode(record.code);
    setCallEnd(Date.now());
    transition('ended');
    const goodbye = `Thank you. We will send you a message when we have news. Your reference is ${spellCode(record.code)}.`;
    setMessage(`We will send you a message when we have news. Your reference is ${record.code}.`);
    await speak(goodbye);
  };

  const startCall = async () => {
    audioCtxRef.current ??= new AudioContext(); // created in the tap, so the browser allows it
    audioCtxRef.current.resume().catch(() => {});
    typedOnlyRef.current = !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined';
    setNotice(typedOnlyRef.current ? 'The microphone is not available. Please type your answers for this call.' : '');
    answersRef.current = [];
    setAnswers([]);
    fieldsRef.current = null;
    setFields(null);
    setMessage('');
    setRecordId(null);
    sessionStorage.removeItem('reunite.phoneRecord');
    t0Ref.current = performance.now();
    setEvents([]);
    setCallStart(Date.now());
    setCallEnd(null);
    setSavedCode(null);
    const e = transition('intro');
    await speak(
      `Hello. This is the family search line. I will ask seven short questions. ${
        autoRef.current ? 'Answer each one; I move on when you stop talking.' : 'Answer each one, then tap Done.'
      }`
    );
    if (alive(e)) askQuestion(0);
  };

  const hangUp = () => {
    setCallStart(null);
    transition('idle');
    if (canSpeak) speechSynthesis.cancel();
  };

  useEffect(() => {
    if (!callStart || callEnd) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [callStart, callEnd]);

  useEffect(() => {
    if (focusInputRef.current && inputRef.current && !inputRef.current.disabled) {
      focusInputRef.current = false;
      inputRef.current.focus();
    }
  }, [state]);

  // Enter outside the text box means "Done"; leaving the page ends the call cleanly.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || ev.target === inputRef.current) return;
      if (MIC_STATES.includes(stateRef.current)) {
        ev.preventDefault();
        submitVoice(stateRef.current.startsWith('confirm') ? 'confirm' : 'question');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      cleanupsRef.current.splice(0).forEach(fn => fn());
      if (canSpeak) speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the phone line's copy of the data fresh, so the SMS preview follows the match.
  useEffect(() => {
    const tick = async () => {
      const health = await serverHealth();
      if (health && !(await applyServerEpoch(health.demo_epoch))) await syncOnce(db, PHONE_LINE.id).catch(() => {});
    };
    tick();
    const t = window.setInterval(tick, 15000);
    return () => clearInterval(t);
  }, [db]);

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
    const { status, suggestion } = recordStatus(r.id, suggestions, eventsByPair(events), new Map(records.map(x => [x.id, x])));
    const out = [`Reunite (demo): We have registered your search. Your reference is ${r.code}.`];
    if (status !== 'Searching') out.push(`Reunite (demo): A possible match is being checked. Reference ${r.code}.`);
    if (status === 'Found' && suggestion) {
      const found = records.find(x => x.id === suggestion.found_id);
      out.push(`Reunite (demo): Found. Please go to the help desk at ${found ? siteName(found.site) : 'the site'}. Reference ${r.code}.`);
    }
    return out;
  }, [db, recordId]);

  const inQuestion = QUESTION_STATES.includes(state);
  const inConfirm = state.startsWith('confirm');
  const micOpen = MIC_STATES.includes(state);
  const submitting = state === 'submitting' || state === 'confirm_submitting';
  const canEdit = inQuestion || state === 'confirm';
  const inCall = state !== 'idle' && state !== 'ended' && state !== 'error';
  const answered = QUESTIONS.map((q, i) => ({ q, i, a: answers[i] })).filter(x => x.a !== undefined);

  // One label per state, announced to screen readers.
  const indicator: { label: string; tone: string; Icon: typeof Mic } =
    state === 'intro' || state === 'speaking' || state === 'confirm_speaking'
      ? { label: 'Speaking…', tone: 'bg-header', Icon: Volume2 }
      : state === 'waiting' || state === 'confirm_waiting'
        ? { label: 'Waiting for you', tone: 'bg-terracotta', Icon: Mic }
        : state === 'listening' || state === 'confirm_listening'
          ? { label: 'Listening…', tone: 'bg-urgent', Icon: Mic }
          : state === 'typing'
            ? { label: 'Typing…', tone: 'bg-civilBlue', Icon: Keyboard }
            : submitting || state === 'understanding' || state === 'saving'
              ? { label: 'One moment…', tone: 'bg-pending', Icon: Loader2 }
              : state === 'confirm'
                ? { label: 'Is that correct?', tone: 'bg-civilBlue', Icon: HelpCircle }
                : state === 'ended'
                  ? { label: 'Call ended', tone: 'bg-verified', Icon: Check }
                  : { label: 'Ready', tone: 'bg-header', Icon: Phone };
  const ring = micOpen ? Math.min(28, (meter.level / Math.max(0.01, meter.threshold ?? 0.03)) * 7) : 0;

  /** Done: the typed answer if there is one, otherwise the spoken one. */
  const done = () => {
    if (typedRef.current.trim() || !micOpen) submitTyped(); // empty and no microphone: "Please type an answer or tap Skip."
    else submitVoice(inConfirm ? 'confirm' : 'question');
  };

  const elapsed = callStart ? Math.max(0, Math.floor(((callEnd ?? now) - callStart) / 1000)) : 0;
  const timer = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const textBtn =
    'min-h-[44px] px-3 rounded-button text-base font-medium text-civilBlue hover:bg-civilBlue-soft active:bg-civilBlue-soft disabled:opacity-40 disabled:hover:bg-transparent';

  const smsBubbles =
    sms && sms.length ? (
      <ul className="space-y-2">
        {sms.map(m => (
          <li key={m} className="max-w-[85%] rounded-card rounded-bl-badge bg-surface border border-borderSlate px-3 py-2 shadow-subtle">
            <span className="block text-xs font-medium text-navy-muted">Reunite</span>
            <span className="block text-base text-navy">{m.replace(/^Reunite \(demo\): /, '')}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-navy-muted">Messages the caller would receive appear here after the call.</p>
    );

  const extracted: Array<[string, string | null | undefined]> = fields
    ? [
        ['Name', fields.name],
        ['Gender', fields.gender === 'unknown' ? null : fields.gender],
        ['Age', fields.age_band],
        ['Village', fields.village],
        ['Searching', fields.relative_name ? `${fields.relative_name}${fields.relative_relation ? ` (${fields.relative_relation})` : ''}` : null],
        ['Clothing, marks', fields.clothing_or_marks],
        ['Last seen', fields.found_where]
      ]
    : [];

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop: the app frame around the call. */}
      <header className="hidden lg:block bg-header text-white">
        <div className="mx-auto max-w-[1200px] px-8 h-14 flex items-center gap-3">
          <a href="/" className="text-lg font-semibold rounded-badge hover:underline">
            Reunite
          </a>
          <span className="text-white/70">Help line</span>
          <span className="badge bg-pending-bg text-pending border-pending-border">Simulated call – demo</span>
        </div>
      </header>

      <div className="lg:max-w-[1200px] lg:mx-auto lg:px-8 lg:py-8 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* The call: the whole screen on phones, a phone-shaped card on desktop. */}
        <section
          aria-label="Call"
          className="h-dvh flex flex-col bg-canvas lg:h-[min(780px,calc(100dvh-8rem))] lg:rounded-[32px] lg:border-[6px] lg:border-header lg:overflow-hidden lg:shadow-subtle lg:sticky lg:top-8"
        >
          <div className="flex-none bg-header text-white px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold truncate">Reunite help line</p>
              <span className="inline-block mt-0.5 rounded-badge bg-white/15 px-1.5 text-xs text-white/90">Simulated call – demo</span>
            </div>
            {inCall || state === 'ended' ? (
              <span className="text-base font-medium tabular-nums text-white/90" aria-label={`Call time ${timer}`}>
                {timer}
              </span>
            ) : (
              <a href="/" className="min-h-[44px] px-2 inline-flex items-center text-sm text-white/90 hover:text-white rounded-button lg:hidden">
                Back to Reunite
              </a>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            {inCall && answered.length > 0 && (
              <ol aria-label="Answers so far" className="mb-4 rounded-card bg-surface border border-borderSlate divide-y divide-borderSlate max-h-40 overflow-y-auto">
                {answered.map(({ q, i, a }) => (
                  <li key={q.label} className="flex items-center gap-2 pl-3 pr-1 min-w-0">
                    <span className="flex-1 min-w-0 truncate text-sm text-navy">
                      <span className="text-navy-muted">{q.label}:</span> {a || '(skipped)'}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => askQuestion(i)}
                        disabled={submitting}
                        className="shrink-0 min-h-[44px] px-3 text-sm font-medium text-civilBlue rounded-button hover:bg-civilBlue-soft disabled:opacity-40"
                      >
                        Edit
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}

            <div className="flex flex-col items-center text-center">
              <span
                className={`mt-2 w-32 h-32 rounded-full flex items-center justify-center text-white transition-[box-shadow] duration-75 ${indicator.tone}`}
                style={{ boxShadow: ring ? `0 0 0 ${ring}px rgba(194, 84, 15, 0.22)` : undefined }}
                aria-hidden
              >
                <indicator.Icon className={`w-12 h-12 ${indicator.Icon === Loader2 ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              </span>
              <p className="mt-4 text-lg font-semibold text-navy" aria-live="polite">
                {indicator.label}
              </p>
              {micOpen && autoAdvance && meter.silenceLeft !== null && (
                <div className="mt-2">
                  <CountdownRing leftMs={meter.silenceLeft} />
                </div>
              )}

              {state === 'idle' && (
                <>
                  <h1 className="mt-6 text-xl font-semibold text-navy">Search for a family member by phone</h1>
                  <p className="mt-1 text-base text-navy-muted">Answer seven short questions by voice or by typing. No real call is made.</p>
                  <label className="mt-4 flex items-start gap-3 text-left min-h-[44px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={ev => setAutoAdvance(ev.target.checked)}
                      className="mt-1 w-5 h-5 shrink-0 accent-terracotta"
                    />
                    <span className="text-sm text-navy">Move on automatically after 2 seconds of silence (otherwise tap "Done" after each answer)</span>
                  </label>
                </>
              )}

              {(state === 'ended' || state === 'error') && (
                <div className="mt-6">
                  {state === 'ended' && savedCode ? (
                    <>
                      <p className="text-sm text-navy-muted">Your reference code</p>
                      <p className="text-score font-semibold tracking-wider text-navy">{savedCode}</p>
                      <p className="mt-2 text-base text-navy">We will send you a message when we have news.</p>
                    </>
                  ) : (
                    <p className="text-base text-navy">{message}</p>
                  )}
                </div>
              )}

              {inQuestion && (
                <div ref={questionRef} className="mt-4 w-full scroll-mt-4">
                  <p className="text-xl font-semibold text-navy" aria-live="polite">
                    {QUESTIONS[qIndex].text}
                  </p>
                  <p className="mt-2 text-sm text-navy-muted">
                    Question {qIndex + 1} of {QUESTIONS.length}
                  </p>
                  <span className="mt-1.5 block h-1 rounded-full bg-pressed overflow-hidden" aria-hidden>
                    <span className="block h-full bg-terracotta" style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} />
                  </span>
                </div>
              )}
              {(inConfirm || state === 'saving') && (
                <div ref={questionRef} className="mt-4 w-full">
                  <p className="text-xl font-semibold text-navy" aria-live="polite">
                    {message}
                  </p>
                </div>
              )}
              {state === 'understanding' && <p className="mt-4 text-base text-navy-muted">Checking your answers…</p>}
              {notice && (
                <p role="alert" className="mt-4 w-full rounded-card bg-pending-bg border border-pending-border px-3 py-2 text-sm text-navy text-left">
                  {notice}
                </p>
              )}
            </div>
          </div>

          {/* Answer area: stays above the on-screen keyboard (the page resizes with it). */}
          <div className="flex-none px-4 pt-3 pb-3 bg-canvas border-t border-borderSlate">
            {(state === 'idle' || state === 'ended' || state === 'error') && (
              <button type="button" onClick={startCall} className="btn-primary h-14 text-lg lg:w-full">
                <Phone className="w-5 h-5" strokeWidth={1.75} />
                {state === 'idle' ? 'Start call' : 'Start another call'}
              </button>
            )}
            {inQuestion && (
              <>
                <label htmlFor="typed-answer" className="sr-only">
                  Type the answer
                </label>
                <div className="flex gap-2">
                  <input
                    id="typed-answer"
                    ref={inputRef}
                    value={typed}
                    disabled={submitting}
                    placeholder="Or type the answer"
                    onChange={ev => onType(ev.target.value)}
                    onFocus={() => setTimeout(() => questionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300)}
                    onKeyDown={ev => {
                      if (ev.key === 'Enter' && !ev.nativeEvent.isComposing) {
                        ev.preventDefault();
                        submitTyped();
                      }
                    }}
                    className="input flex-1 min-w-0"
                    autoComplete="off"
                    enterKeyHint="send"
                  />
                  <button
                    type="button"
                    onClick={done}
                    disabled={submitting || (state === 'speaking' && !typed.trim())}
                    className="btn-primary w-auto min-w-[96px] px-5 lg:min-w-[96px] lg:px-5"
                  >
                    Done
                  </button>
                </div>
                {hint && (
                  <p className="text-sm text-urgent mt-1.5" role="alert">
                    {hint}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-x-1 mt-1">
                  <button type="button" onClick={() => askQuestion(qIndex)} disabled={submitting} className={textBtn}>
                    Repeat question
                  </button>
                  <button type="button" onClick={() => askQuestion(Math.max(0, qIndex - 1))} disabled={submitting || qIndex === 0} className={textBtn}>
                    Back
                  </button>
                  <button type="button" onClick={skip} disabled={submitting} className={textBtn}>
                    Skip
                  </button>
                </div>
              </>
            )}
            {inConfirm && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={confirm} disabled={state === 'confirm_submitting'} className="btn-primary lg:w-full">
                  Yes
                </button>
                <button
                  type="button"
                  onClick={answerNo}
                  disabled={state === 'confirm_submitting'}
                  className="h-12 rounded-button border border-borderSlate bg-surface text-base font-semibold text-navy hover:border-navy active:bg-pressed"
                >
                  No
                </button>
              </div>
            )}
            {(state === 'understanding' || state === 'saving' || state === 'intro') && (
              <p className="text-center text-sm text-navy-muted min-h-[44px] flex items-center justify-center">Please wait…</p>
            )}
          </div>

          {inCall && (
            <div className="flex-none px-4 pt-1 pb-[max(12px,env(safe-area-inset-bottom))] bg-canvas">
              <button
                type="button"
                onClick={hangUp}
                className="w-full h-12 rounded-button bg-urgent text-white text-base font-semibold inline-flex items-center justify-center gap-2 hover:bg-urgent/90 active:bg-urgent/80"
              >
                <PhoneOff className="w-5 h-5" strokeWidth={1.75} />
                End call
              </button>
            </div>
          )}
        </section>

        <div className="min-w-0 px-4 py-4 lg:p-0 space-y-3">
          {/* Phones: the messages below the call, collapsed until it ends. */}
          <details className="lg:hidden card" open={state === 'ended'}>
            <summary className="min-h-[44px] flex items-center cursor-pointer text-base font-semibold text-navy">SMS preview (demo – not sent)</summary>
            <div className="mt-2">{smsBubbles}</div>
          </details>

          {/* Desktop: what the call has captured so far, and the messages. */}
          <section className="hidden lg:block card p-0" aria-label="Call details">
            <div role="tablist" aria-label="Call details" className="flex border-b border-borderSlate px-2">
              {(
                [
                  ['details', 'Captured details'],
                  ['sms', 'SMS preview']
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={sideTab === id}
                  onClick={() => setSideTab(id)}
                  className={`min-h-[48px] px-4 text-base font-medium border-b-2 -mb-px ${
                    sideTab === id ? 'border-terracotta text-navy' : 'border-transparent text-navy-muted hover:text-navy'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="p-5" role="tabpanel">
              {sideTab === 'details' ? (
                <>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {QUESTIONS.map((q, i) => (
                      <div key={q.label} className={`min-w-0 rounded-button p-2 -m-2 ${inQuestion && i === qIndex ? 'bg-terracotta-soft' : ''}`}>
                        <dt className="text-xs text-navy-muted flex items-center gap-2">
                          {q.label}
                          {answers[i] !== undefined && canEdit && (
                            <button type="button" onClick={() => askQuestion(i)} disabled={submitting} className="text-xs font-medium text-civilBlue hover:underline">
                              Edit
                            </button>
                          )}
                        </dt>
                        <dd className={`text-base break-words ${answers[i] === undefined ? 'text-navy-muted' : 'text-navy'}`}>
                          {answers[i] === undefined ? (inQuestion && i === qIndex ? 'Answering now…' : '–') : answers[i] || '(skipped)'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {extracted.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-borderSlate">
                      <h2 className="text-sm font-medium text-navy-muted mb-2">What the line understood</h2>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {extracted.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-navy-muted">{label}</dt>
                            <dd className={`text-base break-words first-letter:uppercase ${value ? 'text-navy' : 'text-navy-muted italic'}`}>{value || 'Not heard'}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                smsBubbles
              )}
            </div>
          </section>

          {debugOn && (
            <section className="card font-mono text-xs text-navy" aria-label="Debug">
              <p>
                state: <b data-testid="debug-state">{state}</b> · question {qIndex + 1} · mode {autoAdvance ? 'auto' : 'done'}
                {typedOnlyRef.current ? ' · typed only' : ''}
              </p>
              <p>
                level {meter.level.toFixed(3)} · noise {meter.noise?.toFixed(3) ?? '–'} · threshold {meter.threshold?.toFixed(3) ?? '–'} · silence timer{' '}
                {meter.silenceLeft !== null ? `${Math.max(0, meter.silenceLeft)} ms left` : 'off'}
              </p>
              <ol className="mt-1 text-navy-muted">
                {events.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
