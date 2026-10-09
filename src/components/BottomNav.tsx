import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenId } from '../types';
import { Bell, Search, UserPlus, type LucideIcon } from 'lucide-react';
import { siteName } from '../sites';
import { SwitchMenu } from './SwitchMenu';
import { InstallButton } from './InstallButton';
import { useUnseenCount } from './Notifications';

// Volunteers register people and are told about matches; reviewing and deciding happens in the authority console.
export type NavTab = 'register' | 'search' | 'notifications';

const navItems: Array<{ id: NavTab; target: ScreenId; label: string; Icon: LucideIcon }> = [
  { id: 'register', target: 'register_choose_type', label: 'Register', Icon: UserPlus },
  { id: 'search', target: 'search_records', label: 'Search', Icon: Search },
  { id: 'notifications', target: 'notifications', label: 'Notifications', Icon: Bell }
];

export const BottomNav: React.FC<{ activeTab: NavTab }> = ({ activeTab }) => {
  const { navigateTo } = useApp();
  const unseen = useUnseenCount();

  return (
    <nav aria-label="Main" className="lg:hidden flex-none bg-surface border-t border-borderSlate pb-[env(safe-area-inset-bottom)]">
      <div className="h-nav grid grid-cols-3">
        {navItems.map(({ id, target, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateTo(target)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={id === 'notifications' && unseen > 0 ? `${label}, ${unseen} new` : undefined}
              className={`relative min-w-0 flex flex-col items-center justify-center gap-0.5 ${
                isActive ? 'text-terracotta' : 'text-navy-muted hover:text-navy'
              }`}
            >
              {isActive && <span aria-hidden className="absolute top-0 h-0.5 w-8 rounded-full bg-terracotta" />}
              <span className="relative">
                <Icon className="icon" />
                {id === 'notifications' && unseen > 0 && (
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

/**
 * Desktop (1024px and up): the product name, the same destinations with icons and labels,
 * notifications, then the site, the volunteer and the Switch menu at the bottom.
 */
export const AppSidebar: React.FC<{ activeTab?: NavTab }> = ({ activeTab }) => {
  const { navigateTo, site, volunteerName } = useApp();
  const unseen = useUnseenCount();
  const items = navItems;

  return (
    <aside className="hidden lg:flex flex-none w-60 flex-col bg-header text-white">
      <div className="px-5 pt-5 pb-4">
        <p className="text-lg font-semibold">Reunite</p>
        <p className="text-xs text-white/70">Field app</p>
      </div>
      <nav aria-label="Main" className="px-3 flex flex-col gap-1">
        {items.map(({ id, target, label, Icon }) => {
          const isActive = activeTab === id;
          const count = id === 'notifications' ? unseen : 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateTo(target)}
              aria-current={isActive ? 'page' : undefined}
              className={`min-h-[44px] px-3 rounded-button flex items-center gap-3 text-base text-left ${
                isActive ? 'bg-white/15 text-white font-semibold' : 'text-white/80 font-medium hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="icon" />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-terracotta text-white text-xs font-semibold leading-[22px] text-center">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto px-3 py-4 border-t border-white/10">
        <div className="px-2 mb-1">
          <p className="text-base font-semibold truncate">{siteName(site)}</p>
          <p className="text-sm text-white/70 truncate">{volunteerName}</p>
        </div>
        <SwitchMenu placement="above" />
        <InstallButton tone="dark" className="mt-2" />
      </div>
    </aside>
  );
};
