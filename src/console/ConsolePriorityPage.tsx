import React from 'react';
import { ChevronRight } from 'lucide-react';
import { buildCases } from '../screens/PriorityCasesScreen';
import { siteName } from '../sites';
import { go, linkProps, useRoute } from '../route';
import { useIsDesktop } from '../useIsDesktop';
import { useConsoleData } from '../workspace/data';
import { MatchDetail } from './MatchQueuePage';
import { RecordPanel } from './RecordPage';
import { EmptyState, HeaderCount, PageHeader } from '../workspace/ui';

/** /console/priority: the field app's priority rules, across every site. Desktop: the chosen case beside the list. */
export const ConsolePriorityPage: React.FC = () => {
  const data = useConsoleData();
  const desktop = useIsDesktop();
  const { params } = useRoute();
  const result = data ? buildCases(null, data.records, data.suggestions, data.events) : null;
  const cases = result?.cases ?? [];
  const selected = cases.find(c => c.key === params.get('case')) ?? cases[0];

  const intro = (
    <PageHeader
      compact
      title="Priority cases"
      description="Children with no family located, people with no name, and matches waiting for a confirmation, across all sites."
      aside={<HeaderCount inline value={data ? cases.length : '–'} label="cases" />}
    />
  );
  if (!data) {
    return (
      <>
        {intro}
        <p className="card text-center text-base text-navy-muted" role="status">
          Loading…
        </p>
      </>
    );
  }

  const caseBody = (c: (typeof cases)[number]) => {
    const r = c.recordId ? data.byId.get(c.recordId) : undefined;
    return (
      <span className="flex-1 min-w-0">
        <span className="block text-base lg:text-sm font-semibold text-navy truncate">{c.title}</span>
        <span className={`block text-sm font-medium ${c.reasonColor}`}>{c.reason}</span>
        <span className="block text-sm text-navy-muted truncate">
          {r ? `${siteName(r.site)} · ` : ''}
          {c.detail}
        </span>
      </span>
    );
  };

  if (desktop) {
    return (
      <>
        {intro}
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,38fr)_minmax(0,62fr)] gap-5">
          <ul className="panel h-full overflow-y-auto overscroll-contain divide-y divide-borderSlate" aria-label="Priority cases">
            {cases.map(c => {
              const on = c.key === selected?.key;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    aria-current={on ? 'true' : undefined}
                    onClick={() => go(`/console/priority?case=${encodeURIComponent(c.key)}`)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left motion-safe:transition-[background-color] motion-safe:duration-150 ${on ? 'bg-terracotta-soft/50 shadow-edge-accent' : 'hover:bg-canvas'}`}
                  >
                    {caseBody(c)}
                  </button>
                </li>
              );
            })}
            {cases.length === 0 && <li className="p-4 text-center text-base text-navy-muted">No priority cases</li>}
          </ul>
          <aside className="h-full min-h-0 min-w-0" aria-label="Selected case">
            {selected?.suggestionId ? (
              <MatchDetail key={selected.suggestionId} id={selected.suggestionId} data={data} />
            ) : selected?.recordId ? (
              <div className="panel h-full overflow-y-auto overscroll-contain p-5">
                <p className="text-sm text-navy-muted mb-3">No match suggested yet for this person.</p>
                <RecordPanel id={selected.recordId} data={data} />
              </div>
            ) : (
              <div className="panel h-full flex items-center justify-center">
                <EmptyState title="No priority cases" hint="Children alone, people without a name, and matches waiting for a confirmation appear here." />
              </div>
            )}
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      {intro}
      <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
        {cases.map(c => {
          const href = c.suggestionId ? `/console/matches?pair=${encodeURIComponent(c.suggestionId)}` : c.recordId ? `/console/records/${c.recordId}` : null;
          return href ? (
            <a key={c.key} {...linkProps(href)} className="card flex items-center gap-3 hover:border-navy/30 active:bg-pressed">
              {caseBody(c)}
              <ChevronRight className="icon text-navy-muted" />
            </a>
          ) : (
            <div key={c.key} className="card flex items-center gap-3">
              {caseBody(c)}
            </div>
          );
        })}
        {cases.length === 0 && <p className="card text-center text-base text-navy-muted md:col-span-2">No priority cases</p>}
      </div>
    </>
  );
};
