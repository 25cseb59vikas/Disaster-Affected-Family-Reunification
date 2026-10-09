import React from 'react';
import { useApp } from '../context/AppContext';
import type { ScreenId } from '../types';
import { Bell, Search, UserPlus, type LucideIcon } from 'lucide-react';
import { siteName } from '../sites';
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
 * Desktop: the same navigation as the authority console's sidebar (navy, contour texture, accent edge on the
 * active item). Icons only at 1024-1279px, labels from 1280px. Site and volunteer at the bottom.
 */
export const AppSidebar: React.FC<{ activeTab?: NavTab }> = ({ activeTab }) => {
  const { navigateTo, site, volunteerName } = useApp();
  const unseen = useUnseenCount();
  const initials =
    volunteerName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]!.toUpperCase())
      .join('') || '?';

  return (
    <aside className="hidden lg:flex flex-none lg:w-sidebar-rail xl:w-sidebar flex-col bg-header bg-topo-dark text-white">
      <div className="h-14 flex items-center px-5 lg:justify-center lg:px-0 xl:justify-start xl:px-5">
        <span className="font-display text-lg font-semibold tracking-tight">
          <span className="hidden lg:inline xl:hidden" aria-hidden>
            R
          </span>
          <span className="lg:hidden xl:inline">Reunite</span>
        </span>
        <span className="ml-2 text-xs text-white/60 lg:hidden xl:inline">Field app</span>
      </div>
      <nav aria-label="Main" className="px-3 mt-2">
        <p className="px-3 mb-1.5 text-label font-medium uppercase text-white/45 lg:hidden xl:block">{siteName(site)}</p>
        <ul className="space-y-0.5">
          {navItems.map(({ id, target, label, Icon }) => {
            const on = activeTab === id;
            const count = id === 'notifications' ? unseen : 0;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => navigateTo(target)}
                  title={label}
                  aria-current={on ? 'page' : undefined}
                  aria-label={count ? `${label}, ${count} new` : undefined}
                  className={`relative w-full h-10 px-3 rounded-panel flex items-center gap-3 text-sm font-medium lg:justify-center xl:justify-start motion-safe:transition-[background-color,color] motion-safe:duration-150 ${
                    on ? 'bg-white/10 text-white shadow-edge-accent' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={on ? 2 : 1.5} />
                  <span className="flex-1 text-left lg:sr-only xl:not-sr-only">{label}</span>
                  {count > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-terracotta text-white text-xs font-semibold leading-5 text-center tabular-nums lg:absolute lg:top-1 lg:right-1 lg:min-w-[16px] lg:h-4 lg:leading-4 lg:px-1 lg:text-label xl:static xl:min-w-[20px] xl:h-5 xl:leading-5 xl:px-1.5 xl:text-xs">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 px-2 lg:justify-center lg:px-0 xl:justify-start xl:px-2">
          <span aria-hidden className="w-8 h-8 shrink-0 rounded-full bg-white/15 text-white text-xs font-semibold flex items-center justify-center" title={volunteerName}>
            {initials}
          </span>
          <div className="min-w-0 flex-1 lg:hidden xl:block">
            <p className="text-sm font-medium text-white truncate">{volunteerName}</p>
            <p className="text-xs text-white/60 truncate">{siteName(site)}</p>
          </div>
        </div>
        <div className="hidden xl:block">
          <InstallButton tone="dark" className="mt-3 w-full justify-center" />
        </div>
      </div>
    </aside>
  );
};
