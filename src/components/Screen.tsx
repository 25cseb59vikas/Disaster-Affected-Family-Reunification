import React from 'react';
import { DesktopStatusBar, TopBar } from './TopBar';
import { AppSidebar, BottomNav, type NavTab } from './BottomNav';

interface ScreenProps {
  children: React.ReactNode;
  /** Show the app chrome: top bar on phones, sidebar and status bar on desktop. */
  header?: boolean;
  showBack?: boolean;
  /** Active navigation tab; omit to hide the bottom navigation on phones. */
  nav?: NavTab | 'notifications';
  /** Pinned under the content, above the nav (e.g. a Save button). Right-aligned on desktop. */
  footer?: React.ReactNode;
  /** Content width from tablet size up. Desktop screens with lists or two columns use 'wide'. */
  width?: 'narrow' | 'medium' | 'wide';
}

const WIDTH = {
  narrow: 'max-w-app md:max-w-xl',
  medium: 'max-w-app md:max-w-3xl',
  wide: 'max-w-app md:max-w-3xl lg:max-w-[1200px]'
};

// Phones (below 768px) and tablets: a 100dvh column with the top bar and bottom navigation; only the
// middle scrolls. Desktop (1024px and up): navy sidebar on the left, status bar on top of the content.
export const Screen: React.FC<ScreenProps> = ({ children, header = true, showBack = false, nav, footer, width = 'medium' }) => (
  <div className="h-dvh w-full max-w-app md:max-w-none mx-auto flex bg-canvas">
    {header && <AppSidebar activeTab={nav} />}
    <div className="flex-1 min-w-0 flex flex-col">
      {header && <TopBar showBack={showBack} />}
      {header && <DesktopStatusBar showBack={showBack} />}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-6 lg:px-8 lg:py-8">
        <div className={`mx-auto w-full ${WIDTH[width]}`}>{children}</div>
      </main>
      {footer && (
        <div
          className={`flex-none px-4 lg:px-8 pt-3 bg-canvas border-t border-borderSlate ${
            nav && nav !== 'notifications' ? 'pb-3' : 'pb-[max(12px,env(safe-area-inset-bottom))]'
          }`}
        >
          <div className={`screen-footer mx-auto w-full ${WIDTH[width]}`}>{footer}</div>
        </div>
      )}
      {nav && nav !== 'notifications' && <BottomNav activeTab={nav} />}
    </div>
  </div>
);
