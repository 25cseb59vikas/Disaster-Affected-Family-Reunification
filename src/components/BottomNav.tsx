import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenId } from '../types';
import { UserPlus, Search, Users, AlertTriangle, type LucideIcon } from 'lucide-react';
import { useUnseenCount } from './Notifications';

export type NavTab = 'register' | 'search' | 'matches' | 'priority';

const navItems: Array<{ id: NavTab; target: ScreenId; label: string; Icon: LucideIcon }> = [
  { id: 'register', target: 'register_choose_type', label: 'Register', Icon: UserPlus },
  { id: 'search', target: 'search_records', label: 'Search', Icon: Search },
  { id: 'matches', target: 'suggested_matches', label: 'Matches', Icon: Users },
  { id: 'priority', target: 'priority_cases', label: 'Priority', Icon: AlertTriangle }
];

export const BottomNav: React.FC<{ activeTab: NavTab }> = ({ activeTab }) => {
  const { navigateTo } = useApp();
  const unseen = useUnseenCount();

  return (
    <nav aria-label="Main" className="lg:hidden flex-none bg-surface border-t border-borderSlate pb-[env(safe-area-inset-bottom)]">
      <div className="h-nav grid grid-cols-4">
        {navItems.map(({ id, target, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateTo(target)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={id === 'matches' && unseen > 0 ? `${label}, ${unseen} new` : undefined}
              className={`relative min-w-0 flex flex-col items-center justify-center gap-0.5 ${
                isActive ? 'text-terracotta' : 'text-navy-muted hover:text-navy'
              }`}
            >
              {isActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-terracotta" />}
              <span className="relative">
                <Icon className="icon" />
                {id === 'matches' && unseen > 0 && (
                  <span className="absolute -top-1.5 left-3.5 min-w-[18px] h-[18px] px-1 rounded-full bg-urgent text-white text-xs font-semibold leading-[18px] text-center">
                    {unseen > 99 ? '99+' : unseen}
                  </span>
                )}
              </span>
              <span className={`text-xs truncate max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/** The same four destinations as a left-hand column, from 1024px wide. */
export const SideNav: React.FC<{ activeTab: NavTab }> = ({ activeTab }) => {
  const { navigateTo } = useApp();
  const unseen = useUnseenCount();

  return (
    <nav aria-label="Main" className="hidden lg:flex flex-none w-56 flex-col gap-1 p-3 bg-surface border-r border-borderSlate overflow-y-auto">
      {navItems.map(({ id, target, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigateTo(target)}
            aria-current={isActive ? 'page' : undefined}
            className={`min-h-[44px] px-3 rounded-button flex items-center gap-3 text-base text-left ${
              isActive ? 'bg-terracotta-soft text-terracotta font-semibold' : 'text-navy-muted font-medium hover:bg-pressed hover:text-navy'
            }`}
          >
            <Icon className="icon" />
            <span className="flex-1">{label}</span>
            {id === 'matches' && unseen > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-urgent text-white text-xs font-semibold leading-5 text-center">
                {unseen > 99 ? '99+' : unseen}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
