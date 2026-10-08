import React from 'react';
import { TopBar } from './TopBar';
import { BottomNav, SideNav, type NavTab } from './BottomNav';

interface ScreenProps {
  children: React.ReactNode;
  /** Show the header with site, volunteer and sync status. */
  header?: boolean;
  showBack?: boolean;
  /** Active navigation tab; omit to hide the navigation. */
  nav?: NavTab;
  /** Pinned under the content, above the nav (e.g. a Save button). */
  footer?: React.ReactNode;
  /** Content width from tablet size up: forms stay readable, lists and two-column screens use the room. */
  width?: 'narrow' | 'medium' | 'wide';
}

const WIDTH = {
  narrow: 'max-w-app md:max-w-xl',
  medium: 'max-w-app md:max-w-3xl',
  wide: 'max-w-app md:max-w-3xl lg:max-w-6xl'
};

// App shell: a 100dvh column. Header and nav stay put; only the middle scrolls.
// Phones: a 430px column with bottom navigation. From 1024px: navigation moves to the left side.
export const Screen: React.FC<ScreenProps> = ({ children, header = true, showBack = false, nav, footer, width = 'medium' }) => (
  <div className="h-dvh w-full max-w-app md:max-w-none mx-auto flex flex-col bg-canvas">
    {header && <TopBar showBack={showBack} />}
    <div className="flex-1 min-h-0 flex">
      {nav && <SideNav activeTab={nav} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-6 lg:px-8 lg:pt-6">
          <div className={`mx-auto w-full ${WIDTH[width]}`}>{children}</div>
        </main>
        {footer && (
          <div className={`flex-none px-4 lg:px-8 pt-3 bg-canvas border-t border-borderSlate ${nav ? 'pb-3' : 'pb-[max(12px,env(safe-area-inset-bottom))]'}`}>
            <div className={`screen-footer mx-auto w-full ${WIDTH[width]}`}>{footer}</div>
          </div>
        )}
      </div>
    </div>
    {nav && <BottomNav activeTab={nav} />}
  </div>
);
