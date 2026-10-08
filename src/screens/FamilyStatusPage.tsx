import React, { useEffect, useState } from 'react';
import { Screen } from '../components/Screen';

type Status = 'searching' | 'checking' | 'found';

// Tamil wording should be checked by a native speaker before use.
const SENTENCES: Record<Status, (desk: string) => [string, string]> = {
  searching: () => ['We are still searching.', 'நாங்கள் இன்னும் தேடிக்கொண்டிருக்கிறோம்.'],
  checking: () => ['A possible match is being checked.', 'சாத்தியமான பொருத்தம் சரிபார்க்கப்படுகிறது.'],
  found: desk => [`Found – please go to the help desk at ${desk}.`, `கண்டுபிடிக்கப்பட்டது – ${desk} உதவி மையத்திற்குச் செல்லவும்.`]
};

const STATUS_BORDER: Record<Status, string> = {
  searching: 'border-navy-muted',
  checking: 'border-pending',
  found: 'border-verified'
};

/** Public page for families: opened at /status, with the record code typed in or passed as ?code=. */
export const FamilyStatusPage: React.FC = () => {
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('code') ?? '');
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
        history.replaceState(null, '', `/status?code=${encodeURIComponent(c)}`);
      }
    } catch {
      setError('The status service cannot be reached right now. Please try again or ask at the help desk.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) check(code);
    // Only on first load with ?code=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [en, ta] = result ? SENTENCES[result.status](result.help_desk ?? '') : ['', ''];

  return (
    <Screen
      header={false}
      width="narrow"
      footer={
        <button type="button" onClick={() => check()} disabled={loading} className="btn-primary">
          {loading ? 'Checking…' : 'Check status'}
        </button>
      }
    >
      <h1 className="screen-title pt-4">Family status</h1>

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
        className="input mb-4 uppercase"
      />

      {error && <p role="alert" className="card mb-3 bg-pending-bg border-pending-border text-base text-navy">{error}</p>}

      {result && (
        <article className="card mb-3" aria-live="polite">
          <div className={`border-l-4 pl-3 space-y-1 ${STATUS_BORDER[result.status]}`}>
            <p className="text-xl font-semibold text-navy">{en}</p>
            <p className="text-lg font-semibold text-navy" lang="ta">{ta}</p>
          </div>
        </article>
      )}

      <div className="card">
        <p className="text-sm text-navy-muted">Help desk</p>
        <p className="text-base text-navy">{result?.help_desk ? `Help desk at ${result.help_desk}` : result ? 'Any help desk can look up your code' : 'At the site where you registered'}</p>
        <p className="text-sm text-navy-muted mt-2">Helpline</p>
        <p className="text-base text-navy">Number to be added</p>
      </div>
    </Screen>
  );
};
