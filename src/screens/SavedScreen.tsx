import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';

export const SavedScreen: React.FC = () => {
  const { db, lastSavedId, navigateTo, setSelectedSuggestionId } = useApp();
  const record = useLiveQuery(() => (lastSavedId ? db.records.get(lastSavedId) : undefined), [db, lastSavedId]);
  const waiting = useLiveQuery(() => (lastSavedId ? db.outbox.get(lastSavedId) : undefined), [db, lastSavedId]);
  const suggestion = useLiveQuery(
    async () => {
      if (!lastSavedId) return undefined;
      const all = await db.suggestions.where('found_id').equals(lastSavedId).toArray();
      all.push(...(await db.suggestions.where('seeking_id').equals(lastSavedId).toArray()));
      return all.sort((a, b) => b.score - a.score)[0];
    },
    [db, lastSavedId]
  );

  if (!record) {
    return (
      <Screen nav="register">
        <h1 className="screen-title">Saved</h1>
        <p className="text-base text-navy-muted">Nothing saved yet.</p>
      </Screen>
    );
  }

  return (
    <Screen
      nav="register"
      footer={
        <button type="button" onClick={() => navigateTo('register_choose_type')} className="btn-primary">
          Register next person
        </button>
      }
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="icon text-verified" />
        <h1 className="text-xl font-semibold text-navy">Saved</h1>
      </div>

      {suggestion && (
        <button
          type="button"
          onClick={() => {
            setSelectedSuggestionId(suggestion.id);
            navigateTo('match_review');
          }}
          className="card w-full mb-3 text-left bg-pending-bg border-pending-border active:bg-pressed"
        >
          <span className="block text-base font-semibold text-navy">
            {record.type === 'found' ? 'Someone may be looking for this person.' : 'Someone like this person may have been found.'}
          </span>
          <span className="block text-sm text-civilBlue mt-0.5">Open the match</span>
        </button>
      )}

      <div className="card">
        <p className="text-sm text-navy-muted">Record code</p>
        <p className="text-xl font-semibold text-navy tracking-wide">{record.code}</p>
        <p className="text-sm text-navy-muted mt-1">Write this code down for the person or their family.</p>
        <p className="text-base text-navy mt-3 truncate">{record.name ?? 'No name given'}</p>
        <p className="text-sm text-navy-muted">
          {waiting ? 'Waiting to sync' : 'Synced'}
        </p>
      </div>
    </Screen>
  );
};
