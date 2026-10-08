import React from 'react';

export interface DesktopRow {
  key: string;
  selected: boolean;
  onSelect: () => void;
  /** Read out by screen readers for the whole row. */
  label: string;
  cells: React.ReactNode[];
}

/**
 * Desktop list with the selected item's detail beside it: a table of rows on the left (sticky header,
 * hover and selected states) and a panel on the right that scrolls on its own.
 * `cols` is the grid template for header and rows, e.g. "grid-cols-[88px_minmax(0,1fr)_auto]".
 */
export const DesktopList: React.FC<{
  head: string[];
  cols: string;
  rows: DesktopRow[];
  panel: React.ReactNode;
  empty?: string | null;
}> = ({ head, cols, rows, panel, empty }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
    <div className="card p-0">
      <div className={`sticky top-0 z-10 grid ${cols} gap-4 px-4 py-2.5 bg-pressed rounded-t-card border-b border-borderSlate text-sm font-medium text-navy-muted`}>
        {head.map(h => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <ul role="listbox" aria-label={head.join(', ')}>
        {rows.map(row => (
          <li key={row.key} role="option" aria-selected={row.selected} className="border-b border-borderSlate last:border-b-0">
            <button
              type="button"
              onClick={row.onSelect}
              aria-label={row.label}
              className={`w-full grid ${cols} gap-4 items-center px-4 py-3 text-left transition-colors ${
                row.selected ? 'bg-terracotta-soft shadow-[inset_3px_0_0_theme(colors.terracotta.DEFAULT)]' : 'hover:bg-canvas'
              }`}
            >
              {row.cells}
            </button>
          </li>
        ))}
      </ul>
      {empty && <p className="p-4 text-center text-base text-navy-muted">{empty}</p>}
    </div>
    <aside className="sticky top-0 max-h-[calc(100dvh-5.5rem)] overflow-y-auto pr-1 min-w-0" aria-label="Details">
      {panel}
    </aside>
  </div>
);
