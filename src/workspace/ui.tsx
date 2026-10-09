import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { PairStatus } from '../matchStatus';

/** Initials in a circle; never a photo of a face in lists. */
export const Avatar: React.FC<{ name: string | null | undefined; size?: 'sm' | 'md' }> = ({ name, size = 'sm' }) => {
  const initials =
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-full bg-pressed text-navy-muted font-semibold flex items-center justify-center ${
        size === 'sm' ? 'w-7 h-7 text-xs' : 'w-10 h-10 text-sm'
      }`}
    >
      {initials}
    </span>
  );
};

/** Pair status as a labelled pill: status colours are only ever used here, always with text. */
export const PAIR_PILL: Record<PairStatus, { label: string; tone: string; dot: string }> = {
  open: { label: 'Open', tone: 'bg-pending-bg text-pending', dot: 'bg-pending' },
  partly_confirmed: { label: '1 of 2 sites confirmed', tone: 'bg-civilBlue-soft text-civilBlue', dot: 'bg-civilBlue' },
  confirmed: { label: 'Family check next', tone: 'bg-civilBlue-soft text-civilBlue', dot: 'bg-civilBlue' },
  verified: { label: 'Verified', tone: 'bg-verified-bg text-verified', dot: 'bg-verified' },
  ruled_out: { label: 'Rejected', tone: 'bg-urgent-bg text-urgent', dot: 'bg-urgent' }
};

export const StatusPill: React.FC<{ status: PairStatus; wrap?: boolean }> = ({ status, wrap }) => {
  const p = PAIR_PILL[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${wrap ? 'leading-tight' : 'whitespace-nowrap'} ${p.tone}`}>
      <span aria-hidden className={`w-1.5 h-1.5 shrink-0 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  );
};

/** Score as a small bar and the number. Neutral colours: strength is not a status. */
export const ScoreBar: React.FC<{ score: number }> = ({ score }) => (
  <span className="inline-flex items-center gap-2" aria-label={score < 0 ? 'No score' : `Score ${score} of 100`}>
    <span aria-hidden className="w-10 h-1.5 rounded-full bg-pressed overflow-hidden">
      <span className="block h-full rounded-full bg-navy/70" style={{ width: `${Math.max(0, score)}%` }} />
    </span>
    <span className="w-7 text-right font-semibold text-navy tabular-nums">{score < 0 ? '–' : score}</span>
  </span>
);

/**
 * Title, one line of description, and anything that belongs on the right (counts, actions).
 * `compact`: one band for full-height work pages (match queue, priority), so the panes get the height.
 */
export const PageHeader: React.FC<{ title: string; description: string; aside?: React.ReactNode; compact?: boolean }> = ({
  title,
  description,
  aside,
  compact
}) =>
  compact ? (
    <header className="flex-none bg-topo-light -mx-4 lg:-mx-8 -mt-6 lg:-mt-4 mb-3 px-4 lg:px-8 pt-6 lg:pt-2.5 pb-4 lg:pb-2.5 border-b border-borderSlate">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-display text-title font-semibold text-navy">{title}</h1>
          <p className="text-sm text-navy-muted [text-wrap:pretty] max-w-xl">{description}</p>
        </div>
        {aside}
      </div>
    </header>
  ) : (
    <header className="bg-topo-light -mx-4 lg:-mx-8 -mt-6 lg:-mt-8 mb-6 px-4 lg:px-8 pt-6 lg:pt-8 pb-6 border-b border-borderSlate">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-display text-title font-semibold text-navy [text-wrap:balance]">{title}</h1>
          <p className="mt-1.5 text-sm text-navy-muted [text-wrap:pretty]">{description}</p>
        </div>
        {aside}
      </div>
    </header>
  );

/** A labelled number for page headers: Space Grotesk for the value, an uppercase label under it. */
export const HeaderCount: React.FC<{ value: number | string; label: string; inline?: boolean }> = ({ value, label, inline }) =>
  inline ? (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-display text-xl font-semibold text-navy tabular-nums">{value}</span>
      <span className="text-xs text-navy-muted">{label}</span>
    </div>
  ) : (
  <div className="min-w-[88px]">
    <p className="font-display text-xl font-semibold text-navy tabular-nums">{value}</p>
    <p className="label-caps mt-0.5">{label}</p>
  </div>
  );

/** One clear sentence and, if useful, one next step. */
export const EmptyState: React.FC<{ title: string; hint: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="px-6 py-12 text-center">
    <p className="text-base font-medium text-navy">{title}</p>
    <p className="mt-1 text-sm text-navy-muted max-w-sm mx-auto [text-wrap:pretty]">{hint}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const SkeletonRows: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div role="status" aria-label="Loading" className="divide-y divide-borderSlate">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-11 px-4 flex items-center gap-4">
        <span className="skeleton h-2 w-16" />
        <span className="skeleton h-3 flex-1 max-w-[180px]" />
        <span className="skeleton h-3 flex-1 max-w-[160px]" />
        <span className="skeleton h-5 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

/**
 * Slide-over or full-screen layer. Escape closes it, focus moves in on open and back to the trigger on close,
 * and the page behind does not scroll.
 */
export const Drawer: React.FC<{
  open: boolean;
  onClose: () => void;
  label: string;
  side?: 'left' | 'right' | 'full';
  children: React.ReactNode;
}> = ({ open, onClose, label, side = 'left', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`fixed inset-0 z-50 flex ${side === 'right' ? 'justify-end' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      {side !== 'full' && <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-header/40 motion-safe:animate-[fadeIn_150ms_ease-out]" tabIndex={-1} />}
      <div
        ref={ref}
        className={`relative flex flex-col overscroll-contain ${
          side === 'left'
            ? 'w-[280px] max-w-[85vw] h-full shadow-overlay motion-safe:animate-[slideIn_150ms_ease-out]'
            : side === 'right'
              ? 'w-[min(640px,92vw)] h-full bg-canvas shadow-overlay motion-safe:animate-[slideInRight_150ms_ease-out]'
              : 'w-full h-full bg-dotgrid'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export const CloseButton: React.FC<{ onClick: () => void; label?: string; tone?: 'dark' | 'light' }> = ({ onClick, label = 'Close', tone = 'dark' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`w-11 h-11 shrink-0 rounded-panel flex items-center justify-center ${tone === 'dark' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-navy hover:bg-pressed'}`}
  >
    <X className="w-5 h-5" strokeWidth={1.5} />
  </button>
);
