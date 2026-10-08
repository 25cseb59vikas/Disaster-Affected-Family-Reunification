import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';
import { db } from '../db/database';
import type { MatchPair } from '../types';

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
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto pb-24">
      <div>
        <TopBar />

        <main className="p-6 pt-8 space-y-6">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left">
            Matches
          </h1>

          {/* List of Match Cards */}
          <div className="space-y-6">
            {matches.map((match, idx) => {
              const isStrong = match.score >= 80;
              return (
                <article
                  key={match.matchId}
                  id={`match-card-${idx + 1}`}
                  className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle space-y-5 text-left"
                >
                  {/* Two photos side-by-side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Found Person */}
                    <div className="flex flex-col items-center text-center p-3 rounded-lg bg-canvas border border-borderSlate">
                      <div className="w-20 h-20 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mb-2 overflow-hidden border border-borderSlate">
                        {match.foundPerson.photoUrl ? (
                          <img src={match.foundPerson.photoUrl} alt={match.foundPerson.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{match.foundPerson.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-[20px] font-bold text-navy leading-snug">
                        {match.foundPerson.name}
                      </span>
                      <span className="text-[18px] text-navy-muted">
                        Age {match.foundPerson.age}
                      </span>
                      <span className="text-[14px] text-civilBlue font-medium mt-1">
                        Found Person
                      </span>
                    </div>

                    {/* Right: Searched Person */}
                    <div className="flex flex-col items-center text-center p-3 rounded-lg bg-canvas border border-borderSlate">
                      <div className="w-20 h-20 rounded-full bg-navy/10 flex items-center justify-center text-navy font-bold text-2xl mb-2 overflow-hidden border border-borderSlate">
                        {match.searchedPerson.photoUrl ? (
                          <img src={match.searchedPerson.photoUrl} alt={match.searchedPerson.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{match.searchedPerson.name.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-[20px] font-bold text-navy leading-snug">
                        {match.searchedPerson.name}
                      </span>
                      <span className="text-[18px] text-navy-muted">
                        Age {match.searchedPerson.age}
                      </span>
                      <span className="text-[14px] text-terracotta font-medium mt-1">
                        Searched For
                      </span>
                    </div>
                  </div>

                  {/* Large Score in the Middle */}
                  <div className="text-center py-2">
                    <span
                      className={`text-[24px] font-bold inline-block px-4 py-1.5 rounded-badge border ${
                        isStrong
                          ? 'text-verified bg-verified-bg border-verified-border'
                          : 'text-pending bg-pending-bg border-pending-border'
                      }`}
                    >
                      {match.scoreLabel}
                    </span>
                  </div>

                  {/* Reasons with ticks */}
                  <div className="space-y-2 py-1 text-left">
                    {match.reasons.map((reason, i) => (
                      <div key={i} className="text-[18px] text-navy flex items-start gap-2">
                        <span className="text-verified font-bold">✓</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-3">
                    <button
                      type="button"
                      onClick={() => handleReview(match)}
                      className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[20px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                    >
                      Review
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDismiss(match.matchId)}
                      className="w-full min-h-[48px] text-[18px] text-navy-muted hover:text-navy font-medium text-center flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Not the same person
                    </button>
                  </div>
                </article>
              );
            })}

            {matches.length === 0 && (
              <div className="p-8 text-center text-[18px] text-navy-muted bg-surface rounded-card border border-borderSlate">
                No new match suggestions at this moment.
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="h-20" />
      <BottomNav activeTab="matches" />
    </div>
  );
};
