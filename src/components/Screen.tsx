import React from 'react';
import { TopBar } from './TopBar';
import { BottomNav, type NavTab } from './BottomNav';

interface ScreenProps {
  children: React.ReactNode;
  /** Show the header with site, volunteer and sync status. */
  header?: boolean;
  showBack?: boolean;
  /** Active bottom-nav tab; omit to hide the bottom navigation. */
  nav?: NavTab;
  /** Pinned under the content, above the nav (e.g. a Save button). */
  footer?: React.ReactNode;
}

// App shell: a 100dvh column (max 430px wide). Header and nav stay put; only the middle scrolls.
export const Screen: React.FC<ScreenProps> = ({ children, header = true, showBack = false, nav, footer }) => (
  <div className="h-dvh w-full max-w-app mx-auto flex flex-col bg-canvas">
    {header && <TopBar showBack={showBack} />}
    <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-6">{children}</main>
    {footer && (
      <div className={`flex-none px-4 pt-3 bg-canvas border-t border-borderSlate ${nav ? 'pb-3' : 'pb-[max(12px,env(safe-area-inset-bottom))]'}`}>
        {footer}
      </div>
    )}
    {nav && <BottomNav activeTab={nav} />}
  </div>
);
