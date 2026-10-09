import React, { useEffect, useState } from 'react';
import { Screen } from '../components/Screen';

type Status = 'searching' | 'checking' | 'found';

// Tamil wording should be checked by a native speaker before use.
const SENTENCES: Record<Status, (desk: string) => [string, string]> = {
  searching: () => ['We are still searching.', 'நாங்கள் இன்னும் தேடிக்கொண்டிருக்கிறோம்.'],
  checking: () => ['A possible match is being checked.', 'சாத்தியமான பொருத்தம் சரிபார்க்கப்படுகிறது.'],
  found: desk => [`Found – please go to the help desk at ${desk}.`, `கண்டுபிடிக்கப்பட்டது – ${desk} உதவி மையத்திற்குச் செல்லவும்.`]
};

// The progress line: where a report is. "Received" is done as soon as the code is known.
const STEPS = ['Received', 'Searching', 'Checking', 'Found'];
const STEP_OF: Record<Status, number> = { searching: 1, checking: 2, found: 3 };

const Progress: React.FC<{ status: Status }> = ({ status }) => {
  const at = STEP_OF[status];
  return (
    <ol aria-label="Progress" className="flex items-start mb-4">
      {STEPS.map((label, i) => {
        const done = i < at || (status === 'found' && i === at);
        const current = i === at;
        return (
          <li key={label} className="flex-1 min-w-0 flex flex-col items-center text-center relative" aria-current={current ? 'step' : undefined}>
            {i > 0 && <span aria-hidden className={`absolute top-[11px] right-1/2 w-full h-0.5 ${i <= at ? 'bg-terracotta' : 'bg-borderSlate'}`} />}
            <span
              aria-hidden
              className={`relative z-[1] w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                done ? 'bg-terracotta text-white' : current ? 'bg-surface text-terracotta ring-2 ring-terracotta' : 'bg-surface text-navy-muted ring-1 ring-borderSlate'
              }`}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={`mt-1.5 text-xs ${current ? 'font-semibold text-navy' : 'text-navy-muted'}`}>
              {label}
              <span className="sr-only">{done ? ' (done)' : current ? ' (now)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const STATUS_BORDER: Record<Status, string> = {
  searching: 'border-navy-muted',
  checking: 'border-pending',
  found: 'border-verified'
};

/**
 * Status by record code: one sentence and a help desk, never record details.
 * `onUrl` keeps the address bar in step with the code that was checked.
 */
export const StatusChecker: React.FC<{ initialCode?: string; onUrl?: (code: string) => void }> = ({ initialCode = '', onUrl }) => {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<{ status: Status; help_desk: string | null } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async (value = code) => {
    const c = value.trim().toUpperCase();
    if (!c) {
      setError('Enter the code you were given, for example A-7K3Q.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/status/${encodeURIComponent(c)}`, { signal: AbortSignal.timeout(10000) });
      if (res.status === 404) {
        setResult(null);
        setError('No record with that code yet. New records can take a few minutes to appear. Check the code, or ask at the help desk.');
      } else if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      } else {
        setResult(await res.json());
        onUrl?.(c);
      }
    } catch {
      setError('The status service cannot be reached right now. Please try again or ask at the help desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) check(code);
    // Only on first load with a code
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [en, ta] = result ? SENTENCES[result.status](result.help_desk ?? '') : ['', ''];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6 lg:items-start">
      <div className="lg:panel lg:p-5">
      <label htmlFor="record-code" className="field-label">
        Record code
      </label>
      <input
        id="record-code"
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && check()}
        placeholder="e.g. A-7K3Q"
        autoCapitalize="characters"
        autoComplete="off"
        className="input mb-3 uppercase"
      />
      <button type="button" onClick={() => check()} disabled={loading} className="btn-primary mb-4 lg:mb-0">
        {loading ? 'Checking…' : 'Check status'}
      </button>

      {error && <p role="alert" className="card mb-3 lg:mb-0 lg:mt-4 bg-pending-bg border-pending-border text-base text-navy">{error}</p>}
      </div>

      <div>

      {result && (
        <article className="card mb-3 lg:panel lg:p-5 lg:mb-4" aria-live="polite">
          <Progress status={result.status} />
          <div className={`border-l-4 pl-3 space-y-1 ${STATUS_BORDER[result.status]}`}>
            <p className="text-xl font-semibold text-navy">{en}</p>
            <p className="text-lg font-semibold text-navy" lang="ta">{ta}</p>
          </div>
        </article>
      )}

      <div className="card lg:panel lg:p-5">
        <p className="text-sm text-navy-muted">Help desk</p>
        <p className="text-base text-navy">{result?.help_desk ? `Help desk at ${result.help_desk}` : result ? 'Any help desk can look up your code' : 'At the site where you registered'}</p>
        <p className="text-sm text-navy-muted mt-2">Helpline</p>
        <p className="text-base text-navy">Number to be added</p>
      </div>
      </div>
    </div>
  );
};

/** Public page for families: opened at /status, with the record code typed in or passed as ?code=. */
export const FamilyStatusPage: React.FC = () => (
  <Screen header={false} width="wide">
    <a href="/" className="btn-text -ml-2">
      Back to Reunite
    </a>
    <h1 className="screen-title pt-2">Family status</h1>
    <StatusChecker
      initialCode={new URLSearchParams(location.search).get('code') ?? ''}
      onUrl={c => history.replaceState(null, '', `/status?code=${encodeURIComponent(c)}`)}
    />
  </Screen>
);
