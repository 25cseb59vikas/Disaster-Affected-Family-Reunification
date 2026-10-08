import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { db } from '../db/database';
import type { MatchPair } from '../types';
import { Check } from 'lucide-react';

const PersonTile: React.FC<{ person: MatchPair['foundPerson']; caption: string }> = ({ person, caption }) => (
  <div className="min-w-0 flex flex-col items-center text-center p-3 rounded-button bg-canvas">
    <span className="w-14 h-14 rounded-full bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted mb-2 overflow-hidden">
      {person.photoUrl ? <img src={person.photoUrl} alt="" className="w-full h-full object-cover" /> : person.name.charAt(0)}
    </span>
    <span className="w-full text-base font-semibold text-navy truncate">{person.name}</span>
    <span className="text-sm text-navy-muted">Age {person.age}</span>
    <span className="text-xs text-navy-muted mt-0.5">{caption}</span>
  </div>
);

export const SuggestedMatchesScreen: React.FC = () => {
  const { navigateTo, setSelectedMatch } = useApp();
  const [matches, setMatches] = useState<MatchPair[]>([]);

  useEffect(() => {
    db.matches.toArray().then(data => {
      setMatches(data);
    });
  }, []);

  const handleReview = (match: MatchPair) => {
    setSelectedMatch(match);
    navigateTo('match_review');
  };

  const handleDismiss = async (matchId: string) => {
    await db.matches.where('matchId').equals(matchId).delete();
    setMatches(prev => prev.filter(m => m.matchId !== matchId));
  };

  return (
    <Screen nav="matches">
      <h1 className="screen-title">Matches</h1>

      <div className="card-stack">
        {matches.map((match, idx) => {
          const isStrong = match.score >= 80;
          return (
            <article key={match.matchId} id={`match-card-${idx + 1}`} className="card">
              <div className="grid grid-cols-2 gap-2">
                <PersonTile person={match.foundPerson} caption="Found here" />
                <PersonTile person={match.searchedPerson} caption="Searched for" />
              </div>

              <div className="flex items-baseline justify-center gap-2 my-3">
                <span className={`text-score font-semibold ${isStrong ? 'text-verified' : 'text-pending'}`}>{match.score}</span>
                <span className={`badge ${isStrong ? 'bg-verified-bg text-verified border-verified-border' : 'bg-pending-bg text-pending border-pending-border'}`}>
                  {isStrong ? 'Strong match' : 'Possible match'}
                </span>
              </div>

              <ul className="space-y-1 mb-3">
                {match.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-verified" strokeWidth={1.75} />
                    <span className="min-w-0">{reason}</span>
                  </li>
                ))}
              </ul>

              <button type="button" onClick={() => handleReview(match)} className="btn-primary">
                Review
              </button>
              <button type="button" onClick={() => handleDismiss(match.matchId)} className="btn-text w-full text-navy-muted">
                Not the same person
              </button>
            </article>
          );
        })}

        {matches.length === 0 && <p className="card text-center text-base text-navy-muted">No new match suggestions.</p>}
      </div>
    </Screen>
  );
};
