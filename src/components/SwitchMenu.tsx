import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Repeat } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SITES } from '../sites';
import { switchRole } from '../role';

/**
 * "Switch": change site (Camp A / Hospital B) without leaving the volunteer app, or change role
 * (back to "How are you using Reunite?"). `placement` opens the menu below (top bar) or above (sidebar).
 */
export const SwitchMenu: React.FC<{ placement?: 'below' | 'above'; tone?: 'dark' | 'light' }> = ({ placement = 'below', tone = 'dark' }) => {
  const { site, volunteerName, chooseSite, navigateTo } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'w-full min-h-[44px] px-3 flex items-center gap-2 text-left text-base text-navy rounded-badge hover:bg-pressed focus-visible:bg-pressed';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-button text-sm font-medium ${
          tone === 'dark' ? 'text-white/90 hover:text-white hover:bg-white/10' : 'text-navy hover:bg-pressed'
        }`}
      >
        {tone === 'light' && <Repeat className="w-4 h-4" strokeWidth={1.75} />}
        Switch
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 w-60 p-1.5 rounded-card bg-surface border border-borderSlate shadow-subtle ${
            placement === 'below' ? 'right-0 top-full mt-1' : 'left-0 bottom-full mb-1'
          }`}
        >
          <p className="px-3 pt-1.5 pb-1 text-xs font-medium text-navy-muted">Change site</p>
          {SITES.map(s => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === site}
              onClick={() => {
                setOpen(false);
                // Same volunteer at another site; no name yet means the site screen asks for it.
                if (volunteerName) chooseSite(s.id, volunteerName);
                else navigateTo('choose_site');
              }}
              className={item}
            >
              <span className="flex-1">{s.name}</span>
              {s.id === site && <Check className="w-4 h-4 text-verified" strokeWidth={2} />}
            </button>
          ))}
          <div className="my-1 border-t border-borderSlate" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              switchRole();
            }}
            className={item}
          >
            Change role
          </button>
        </div>
      )}
    </div>
  );
};
