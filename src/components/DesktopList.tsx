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
 * Desktop list with the selected item's detail beside it, as in the authority console: the list (38%) and the
 * detail (62%) each scroll on their own inside the window height, so the page itself never scrolls.
 * `cols` is the grid template for header and rows, e.g. "grid-cols-[88px_minmax(0,1fr)_auto]".
 */
export const DesktopList: React.FC<{
  head: string[];
  cols: string;
  rows: DesktopRow[];
  panel: React.ReactNode;
  empty?: string | null;
}> = ({ head, cols, rows, panel, empty }) => (
  <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,38fr)_minmax(0,62fr)] gap-5">
    <div className="panel h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className={`sticky top-0 z-10 grid ${cols} gap-3 px-4 h-9 items-center bg-surface border-b border-borderSlate label-caps`}>
        {head.map((h, i) => (
          <span key={h || i}>{h}</span>
        ))}
      </div>
      <ul role="listbox" aria-label={head.filter(Boolean).join(', ')}>
        {rows.map(row => (
          <li key={row.key} role="option" aria-selected={row.selected} className="border-b border-borderSlate last:border-b-0">
            <button
              type="button"
              onClick={row.onSelect}
              aria-label={row.label}
              className={`w-full grid ${cols} gap-3 items-center px-4 py-2.5 text-left text-table motion-safe:transition-colors motion-safe:duration-150 ${
                row.selected ? 'bg-terracotta-soft/60 shadow-edge-accent' : 'hover:bg-canvas'
              }`}
            >
              {row.cells}
            </button>
          </li>
        ))}
      </ul>
      {empty && <p className="p-4 text-center text-sm text-navy-muted">{empty}</p>}
    </div>
    <aside className="h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain" aria-label="Details">
      {panel}
    </aside>
  </div>
);
