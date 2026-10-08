import React from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { BottomNav } from '../components/BottomNav';

export const PriorityCasesScreen: React.FC = () => {
  const { navigateTo, setSelectedMatch } = useApp();

  const priorityCases = [
    {
      id: 'priority-1',
      name: 'Aravind',
      reason: 'Child alone',
      reasonColor: 'text-[#B3261E]',
      age: 7,
      village: 'Nagapattinam Coast',
      relativeName: 'Unknown'
    },
    {
      id: 'priority-2',
      name: 'Unknown Male',
      reason: 'Not identified',
      reasonColor: 'text-[#B7791F]',
      age: 45,
      village: 'Unknown Area',
      relativeName: 'Unknown'
    },
    {
      id: 'priority-3',
      name: 'Lakshmi Narayanan',
      reason: 'No match after 24 hours',
      reasonColor: 'text-[#0F1B2D]',
      age: 71,
      village: 'Kilvelur South',
      relativeName: 'Parvathi'
    }
  ];

  const handleOpenCase = (c: typeof priorityCases[0]) => {
    setSelectedMatch({
      matchId: `match-priority-${c.id}`,
      foundPerson: {
        name: c.name,
        age: c.age,
        photoUrl: '',
        village: c.village,
        relativeName: c.relativeName,
        site: 'Camp A – Govt. High School'
      },
      searchedPerson: {
        name: `${c.name} (Family Search)`,
        age: c.age,
        photoUrl: '',
        village: c.village,
        relativeName: c.relativeName,
        site: 'Central Registry Dispatch'
      },
      score: 90,
      scoreLabel: 'Priority Review',
      reasons: [c.reason, 'Immediate officer action required'],
      step: 2,
      status: 'pending'
    });
    navigateTo('match_review');
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between max-w-lg mx-auto pb-24">
      <div>
        <TopBar />

        <main className="p-6 pt-8 space-y-6">
          <h1 className="text-[28px] font-bold text-navy leading-tight text-left">
            Priority
          </h1>

          {/* Three large numbers at top in a single row */}
          <div className="bg-surface rounded-card border border-borderSlate p-5 shadow-subtle grid grid-cols-3 divide-x divide-borderSlate text-center">
            <div className="px-2">
              <span className="block text-[32px] font-bold text-navy leading-none">
                312
              </span>
              <span className="block text-[18px] text-navy-muted mt-2 font-medium">
                Registered
              </span>
            </div>
            <div className="px-2">
              <span className="block text-[32px] font-bold text-terracotta leading-none">
                48
              </span>
              <span className="block text-[18px] text-navy-muted mt-2 font-medium">
                Searching
              </span>
            </div>
            <div className="px-2">
              <span className="block text-[32px] font-bold text-verified leading-none">
                186
              </span>
              <span className="block text-[18px] text-navy-muted mt-2 font-medium">
                Reunited
              </span>
            </div>
          </div>

          {/* List of priority cards */}
          <div className="space-y-5 text-left">
            {priorityCases.map((c) => (
              <article
                key={c.id}
                className="bg-surface rounded-card border border-borderSlate p-6 shadow-subtle space-y-4"
              >
                <div className="flex items-center gap-4">
                  {/* Photo thumbnail 64x64 */}
                  <div className="w-16 h-16 rounded-lg bg-navy/10 flex-shrink-0 flex items-center justify-center text-navy font-bold text-2xl border border-borderSlate">
                    {c.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-[22px] font-bold text-navy truncate">
                      {c.name}
                    </h2>
                    {/* Reason in bold color */}
                    <p className={`text-[20px] font-bold mt-1 ${c.reasonColor}`}>
                      {c.reason}
                    </p>
                  </div>
                </div>

                {/* 56px tall Open button */}
                <button
                  type="button"
                  onClick={() => handleOpenCase(c)}
                  className="w-full h-14 bg-terracotta hover:bg-terracotta-hover active:bg-terracotta-active text-white text-[20px] font-bold rounded-input transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                >
                  Open
                </button>
              </article>
            ))}
          </div>
        </main>
      </div>

      <div className="h-20" />
      <BottomNav activeTab="priority" />
    </div>
  );
};
