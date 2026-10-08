import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenId } from '../types';
import { UserPlus, Search, Users, AlertTriangle, type LucideIcon } from 'lucide-react';

export type NavTab = 'register' | 'search' | 'matches' | 'priority';

const navItems: Array<{ id: NavTab; target: ScreenId; label: string; Icon: LucideIcon }> = [
  { id: 'register', target: 'register_choose_type', label: 'Register', Icon: UserPlus },
  { id: 'search', target: 'search_records', label: 'Search', Icon: Search },
  { id: 'matches', target: 'suggested_matches', label: 'Matches', Icon: Users },
  { id: 'priority', target: 'priority_cases', label: 'Priority', Icon: AlertTriangle }
];

export const BottomNav: React.FC<{ activeTab: NavTab }> = ({ activeTab }) => {
  const { navigateTo } = useApp();

  return (
    <nav aria-label="Main" className="flex-none bg-surface border-t border-borderSlate pb-[env(safe-area-inset-bottom)]">
      <div className="h-nav grid grid-cols-4">
        {navItems.map(({ id, target, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateTo(target)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-w-0 flex flex-col items-center justify-center gap-0.5 ${
                isActive ? 'text-terracotta' : 'text-navy-muted hover:text-navy'
              }`}
            >
              {isActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-terracotta" />}
              <Icon className="icon" />
              <span className={`text-xs truncate max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
