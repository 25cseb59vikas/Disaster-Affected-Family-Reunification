import React from 'react';
import { ChevronRight } from 'lucide-react';
import { buildCases } from '../screens/PriorityCasesScreen';
import { siteName } from '../sites';
import { linkProps } from '../route';
import { useConsoleData } from './data';

/** /console/priority: the field app's priority rules, across every site. */
export const ConsolePriorityPage: React.FC = () => {
  const data = useConsoleData();
  const result = data ? buildCases(null, data.records, data.suggestions, data.events) : null;

  return (
    <>
      <h1 className="screen-title">Priority cases</h1>
      <p className="text-sm text-navy-muted -mt-2 mb-4">Children with no family located, people with no name, and matches waiting for a confirmation, across all sites.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {result?.cases.map(c => {
          const r = data!.records.find(x => c.key.endsWith(x.id));
          const href = c.suggestionId ? `/console/matches?pair=${encodeURIComponent(c.suggestionId)}` : r ? `/console/records/${r.id}` : null;
          const body = (
            <>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-navy truncate">{c.title}</span>
                <span className={`block text-sm font-medium ${c.reasonColor}`}>{c.reason}</span>
                <span className="block text-sm text-navy-muted truncate">
                  {r ? `${siteName(r.site)} · ` : ''}
                  {c.detail}
                </span>
              </span>
              {href && <ChevronRight className="icon text-navy-muted" />}
            </>
          );
          return href ? (
            <a key={c.key} {...linkProps(href)} className="card flex items-center gap-3 hover:border-navy/30 active:bg-pressed">
              {body}
            </a>
          ) : (
            <div key={c.key} className="card flex items-center gap-3">
              {body}
            </div>
          );
        })}
        {result && result.cases.length === 0 && <p className="card text-center text-base text-navy-muted md:col-span-2">No priority cases</p>}
      </div>
    </>
  );
};
