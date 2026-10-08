import React from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { ChevronRight } from 'lucide-react';

export const PriorityCasesScreen: React.FC = () => {
  const { navigateTo, setSelectedMatch } = useApp();

  const priorityCases = [
    {
      id: 'priority-1',
      name: 'Aravind',
      reason: 'Child alone',
      reasonColor: 'text-urgent',
      age: 7,
      village: 'Nagapattinam Coast',
      relativeName: 'Unknown'
    },
    {
      id: 'priority-2',
      name: 'Unknown Male',
      reason: 'Not identified',
      reasonColor: 'text-pending',
      age: 45,
      village: 'Unknown Area',
      relativeName: 'Unknown'
    },
    {
      id: 'priority-3',
      name: 'Lakshmi Narayanan',
      reason: 'No match after 24 hours',
      reasonColor: 'text-navy',
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

  const counts = [
    { value: 312, label: 'Registered', color: 'text-navy' },
    { value: 48, label: 'Searching', color: 'text-terracotta' },
    { value: 186, label: 'Reunited', color: 'text-verified' }
  ];

  return (
    <Screen nav="priority">
      <h1 className="screen-title">Priority</h1>

      <div className="card grid grid-cols-3 divide-x divide-borderSlate text-center mb-3">
        {counts.map(c => (
          <div key={c.label} className="min-w-0 px-1">
            <span className={`block text-xl font-semibold ${c.color}`}>{c.value}</span>
            <span className="block text-xs text-navy-muted truncate">{c.label}</span>
          </div>
        ))}
      </div>

      <div className="card-stack">
        {priorityCases.map(c => (
          <button
            type="button"
            key={c.id}
            onClick={() => handleOpenCase(c)}
            className="card w-full flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
          >
            <span className="w-12 h-12 shrink-0 rounded-button bg-pressed flex items-center justify-center text-lg font-semibold text-navy-muted">
              {c.name.charAt(0)}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-semibold text-navy truncate">{c.name}</span>
              <span className={`block text-sm font-medium ${c.reasonColor}`}>{c.reason}</span>
            </span>
            <ChevronRight className="icon text-navy-muted" />
          </button>
        ))}
      </div>
    </Screen>
  );
};
