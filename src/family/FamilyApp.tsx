import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, LifeBuoy, Phone, Search, UserSearch, type LucideIcon } from 'lucide-react';
import { emptyDraft, type VoiceDraft } from '../context/AppContext';
import { siteDb } from '../db/database';
import { DetailsForm } from '../intake/DetailsForm';
import { IntakeChooser } from '../intake/IntakeChooser';
import { saveRecord, type NewPerson } from '../records';
import { linkProps, useRoute } from '../route';
import { switchRole } from '../role';
import { AUTHORITY, FAMILY_APP, SITES } from '../sites';
import { applyServerEpoch, pushOutbox, serverHealth } from '../sync';
import type { PersonRecord } from '../types';
import { DemoNotice } from '../components/DemoNotice';
import { InstallButton } from '../components/InstallButton';
import { StatusChecker } from '../screens/FamilyStatusPage';
import { useIsDesktop } from '../useIsDesktop';

// The family app only ever holds the reports made on this phone. It sends them (push) and never
// downloads anything (no pull), so it cannot list, search or show records of people found.
const db = siteDb(FAMILY_APP.id);
const SEND_EVERY_MS = 15000;

function useSender() {
  const waiting = useLiveQuery(() => db.outbox.count(), [], 0);
  useEffect(() => {
    const send = async () => {
      const health = await serverHealth();
      if (!health || (await applyServerEpoch(health.demo_epoch))) return;
      await pushOutbox(db, FAMILY_APP.id).catch(() => {}); // stays queued until the server is reachable
    };
    send();
    const t = window.setInterval(send, SEND_EVERY_MS);
    return () => clearInterval(t);
  }, []);
  return waiting;
}

const W = 'mx-auto w-full max-w-app md:max-w-3xl lg:max-w-[1200px] px-4 lg:px-8';

const NAV: Array<[string, string]> = [
  ['/family/report', 'Report a missing person'],
  ['/family/status', 'Check status'],
  ['/family/help', 'Get help']
];

/**
 * /family: report a missing person, check a report, get help or call. No camp login.
 * Phones: a short header and stacked choices. Desktop: top navigation, a calm header with the contour
 * texture on the start page, and the same panels and type as the authority console.
 */
export const FamilyApp: React.FC = () => {
  const { path, params } = useRoute();
  const waiting = useSender();

  let page: React.ReactNode;
  let home = false;
  if (path.startsWith('/family/report')) page = <ReportPage />;
  else if (path.startsWith('/family/status')) page = <StatusPage code={params.get('code') ?? ''} />;
  else if (path.startsWith('/family/help')) page = <HelpPage />;
  else {
    page = <HomePage />;
    home = true;
  }

  return (
    <div className="min-h-dvh bg-canvas bg-dotgrid flex flex-col">
      <header className="bg-header text-white border-b border-white/10">
        <div className={`${W} h-header lg:h-14 flex items-center gap-8`}>
          <a
            {...linkProps('/family')}
            className="min-w-0 min-h-[44px] rounded-button flex flex-col justify-center max-lg:flex-1 lg:flex-row lg:items-baseline lg:self-center lg:min-h-0 lg:gap-2"
          >
            <span className="font-display text-lg font-semibold tracking-tight">Reunite</span>
            <span className="text-xs text-white/70">For families</span>
          </a>
          <nav aria-label="Main" className="hidden lg:flex flex-1 self-stretch gap-1">
            {NAV.map(([href, label]) => {
              const on = path.startsWith(href);
              return (
                <a
                  key={href}
                  {...linkProps(href)}
                  aria-current={on ? 'page' : undefined}
                  className={`px-3 flex items-center text-sm font-medium border-b-2 motion-safe:transition-colors ${
                    on ? 'border-terracotta text-white' : 'border-transparent text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </a>
              );
            })}
            <a href="/phone" className="px-3 flex items-center gap-1.5 text-sm font-medium border-b-2 border-transparent text-white/70 hover:text-white">
              <Phone className="w-4 h-4" strokeWidth={1.5} /> Call instead
            </a>
          </nav>
          {waiting > 0 && <span className="shrink-0 text-xs text-white/80">{waiting} waiting to send</span>}
        </div>
      </header>

      {home && (
        <section className="bg-header bg-topo-dark text-white">
          <div className={`${W} pt-6 pb-8 lg:pt-14 lg:pb-20`}>
            <h1 className="font-display text-title lg:text-metric font-semibold tracking-tight leading-tight">How can we help?</h1>
            <p className="mt-2 text-base text-white/75 max-w-xl [text-wrap:pretty]">
              Report someone you are looking for, follow a report with your reference code, or find a help desk. Staff check identity and
              family before they share where anyone is.
            </p>
          </div>
        </section>
      )}

      <main className={`flex-1 ${W} py-4 lg:py-8 ${home ? 'lg:-mt-14' : ''}`}>{page}</main>
      <div className={`${W} pb-2 flex flex-wrap items-center gap-x-3`}>
        <button type="button" onClick={switchRole} className="btn-text -ml-2 text-sm">
          Change role
        </button>
        <InstallButton />
      </div>
      <DemoNotice />
    </div>
  );
};

const Back: React.FC = () => (
  <a {...linkProps('/family')} className="btn-text -ml-2 mb-2 gap-1">
    <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> Back
  </a>
);

/** Desktop page heading, the same as the console's page headers. */
const PageTitle: React.FC<{ title: string; helper: string }> = ({ title, helper }) => (
  <header className="mb-5 pb-4 border-b border-borderSlate">
    <h1 className="font-display text-title font-semibold tracking-tight text-navy leading-tight">{title}</h1>
    <p className="mt-1 text-sm text-navy-muted">{helper}</p>
  </header>
);

/** Phones: the back link and title; desktop: the page heading. */
const Heading: React.FC<{ title: string; helper: string }> = ({ title, helper }) => (
  <>
    <div className="lg:hidden">
      <Back />
      <h1 className="screen-title">{title}</h1>
    </div>
    <div className="hidden lg:block">
      <PageTitle title={title} helper={helper} />
    </div>
  </>
);

const Choice: React.FC<{ href: string; Icon: LucideIcon; title: string; helper: string; external?: boolean }> = ({ href, Icon, title, helper, external }) => (
  <a
    {...(external ? { href } : linkProps(href))}
    className="card w-full min-h-[72px] flex items-center gap-3 text-left hover:border-navy/30 active:bg-pressed"
  >
    <span className="w-10 h-10 shrink-0 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
      <Icon className="icon" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-lg font-semibold text-navy">{title}</span>
      <span className="block text-sm text-navy-muted">{helper}</span>
    </span>
    <ChevronRight className="icon text-navy-muted" />
  </a>
);

const ActionCard: React.FC<{ href: string; Icon: LucideIcon; title: string; helper: string; cta: string }> = ({ href, Icon, title, helper, cta }) => (
  <a
    {...linkProps(href)}
    className="group panel shadow-raised p-6 flex flex-col gap-3 hover:shadow-overlay motion-safe:transition-shadow motion-safe:duration-150"
  >
    <span className="w-11 h-11 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </span>
    <span className="font-display text-xl font-semibold tracking-tight text-navy">{title}</span>
    <span className="flex-1 text-sm text-navy-muted [text-wrap:pretty]">{helper}</span>
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta">
      {cta}
      <ArrowRight className="w-4 h-4 motion-safe:transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
    </span>
  </a>
);

const HomePage: React.FC = () => {
  const mine = useLiveQuery(() => db.records.orderBy('created_at').reverse().toArray(), [], [] as PersonRecord[]);
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:hidden [&>*]:min-w-0">
        <Choice href="/family/report" Icon={UserSearch} title="Report a missing person" helper="Tell us who you are looking for" />
        <Choice href="/family/status" Icon={Search} title="Check status" helper="Use the reference code you were given" />
        <Choice href="/family/help" Icon={LifeBuoy} title="Get help" helper="Help desks and what to bring" />
        <Choice href="/phone" Icon={Phone} title="Call instead" helper="Answer a few questions by voice (demo line)" external />
      </div>

      {/* Desktop: three action cards in a row, raised over the header. */}
      <div className="hidden lg:grid grid-cols-3 gap-5">
        <ActionCard href="/family/report" Icon={UserSearch} title="Report a missing person" helper="Tell us who you are looking for. Speak, add a photo or type." cta="Start a report" />
        <ActionCard href="/family/status" Icon={Search} title="Check status" helper="Use the reference code you were given when you reported." cta="Check a code" />
        <ActionCard href="/family/help" Icon={LifeBuoy} title="Get help" helper="Where the help desks are and what to bring with you." cta="See help desks" />
      </div>
      <p className="hidden lg:block mt-4 text-sm text-navy-muted">
        Prefer to talk?{' '}
        <a href="/phone" className="font-medium text-civilBlue hover:underline">
          Call instead
        </a>{' '}
        and answer a few questions by voice (demo line).
      </p>

      {mine.length > 0 && (
        <section className="mt-6 lg:mt-8">
          <h2 className="label-caps mb-2">Reported from this device</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
            {mine.map(r => (
              <a key={r.id} {...linkProps(`/family/status?code=${encodeURIComponent(r.code)}`)} className="card lg:panel lg:p-4 flex items-center gap-3 hover:border-navy/30">
                <span className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-navy truncate">{r.name ?? 'Name not given'}</span>
                  <span className="block text-sm text-navy-muted">Reference {r.code}</span>
                </span>
                <span className="text-sm text-civilBlue shrink-0">Check status</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

const NEXT: Array<[string, string]> = [
  ['Your report is sent', 'It goes to the relief teams at every site. You get a reference code.'],
  ['Staff look for a match', 'When someone who may match is registered, staff at that site check in person.'],
  ['We check it is your family', 'Before anything is shared, staff ask you something only your family would know.'],
  ['You meet at a help desk', 'Follow progress with your reference code, here or at any help desk.']
];

const WhatHappensNext: React.FC = () => (
  <aside aria-label="What happens next" className="hidden lg:block panel p-5 sticky top-6">
    <h2 className="label-caps">What happens next</h2>
    <ol className="mt-3 space-y-4">
      {NEXT.map(([title, body], i) => (
        <li key={title} className="flex gap-3">
          <span aria-hidden className="w-6 h-6 shrink-0 rounded-full border border-borderSlate text-xs font-semibold text-navy tabular-nums flex items-center justify-center">
            {i + 1}
          </span>
          <span>
            <span className="block text-sm font-semibold text-navy">{title}</span>
            <span className="block text-xs text-navy-muted [text-wrap:pretty]">{body}</span>
          </span>
        </li>
      ))}
    </ol>
  </aside>
);

const ReportPage: React.FC = () => {
  const desktop = useIsDesktop();
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<PersonRecord | null>(null);
  const sent = useLiveQuery(async () => (saved ? !(await db.outbox.get(saved.id)) : false), [saved], false);

  const save = async (person: NewPerson) => {
    setSaving(true);
    const record = await saveRecord(db, FAMILY_APP.id, 'seeking', person.relative_name || 'Family app', { ...person, source: 'family' });
    setSaving(false);
    setSaved(record);
    pushOutbox(db, FAMILY_APP.id).catch(() => {}); // retried every 15 s while the app is open
  };

  if (saved) {
    return (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:items-start">
        <div className="lg:panel lg:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="icon text-verified" />
            <h1 className="text-xl font-semibold text-navy">Report saved</h1>
          </div>
          <div className="card lg:shadow-none lg:bg-canvas">
            <p className="text-sm text-navy-muted">Your reference code</p>
            <p className="font-display text-title font-semibold text-navy tracking-wide">{saved.code}</p>
            <p className="text-sm text-navy-muted mt-1">Write it down. Use it to check the search here or at any help desk.</p>
            <p className="text-base text-navy mt-3">{sent ? 'Sent to the relief teams.' : 'Saved on this device. It will be sent when there is a connection.'}</p>
          </div>
          <div className="lg:flex lg:items-center lg:gap-4 lg:mt-4">
            <a {...linkProps(`/family/status?code=${encodeURIComponent(saved.code)}`)} className="btn-primary mt-4 lg:mt-0 lg:w-auto lg:px-8">
              Check status
            </a>
            <a {...linkProps('/family')} className="btn-text -ml-2 mt-2 lg:mt-0">
              Back to the start
            </a>
          </div>
        </div>
        <WhatHappensNext />
      </div>
    );
  }

  // Phones: speak / photo / type first, then check the details.
  if (!draft && !desktop) {
    return (
      <>
        <Back />
        <h1 className="screen-title">Who are you looking for?</h1>
        <p className="text-sm text-navy-muted -mt-2 mb-4">Speak, take a photo, or type. You can check and change everything next.</p>
        <IntakeChooser type="seeking" onDone={setDraft} />
      </>
    );
  }

  // Desktop: straight to the form (speaking and a photo are inside it), beside "what happens next".
  return (
    <>
      {desktop ? (
        <PageTitle title="Report a missing person" helper="Tell us about the person you are looking for. Speak, add a photo or type." />
      ) : (
        <>
          <button type="button" onClick={() => setDraft(null)} className="btn-text -ml-2 mb-2 gap-1">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> Back
          </button>
          <h1 className="screen-title">Check the details</h1>
        </>
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:items-start">
        <div className="min-w-0 lg:panel lg:p-6">
          <DetailsForm formId="family-report" type="seeking" draft={draft ?? emptyDraft} variant="family" onSave={save} />
          <div className="sticky bottom-0 -mx-4 px-4 py-3 mt-6 bg-canvas border-t border-borderSlate lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:bg-transparent lg:flex lg:items-center lg:justify-between lg:gap-4">
            <p className="hidden lg:block text-xs text-navy-muted">Only relief staff see your report. You get a reference code to check its status.</p>
            <button type="submit" form="family-report" disabled={saving} className="btn-primary lg:w-auto lg:px-8">
              {saving ? 'Saving…' : 'Send report'}
            </button>
          </div>
          <p className="text-sm text-navy-muted mt-2 lg:hidden">Only relief staff see your report. You will get a reference code to check its status.</p>
        </div>
        <WhatHappensNext />
      </div>
    </>
  );
};

const StatusPage: React.FC<{ code: string }> = ({ code }) => (
  <>
    <Heading title="Check status" helper="Enter the reference code you were given. We show progress, never anyone's details." />
    <StatusChecker
      key={code}
      initialCode={code}
      onUrl={c => history.replaceState(null, '', `/family/status?code=${encodeURIComponent(c)}`)}
    />
  </>
);

const HelpPage: React.FC = () => (
  <>
    <Heading title="Get help" helper="Help desks, what to bring, and what to do if a child is alone." />
    <div className="grid gap-3 lg:grid-cols-2 lg:gap-5 [&>*]:min-w-0 lg:[&>section]:panel lg:[&>section]:p-5">
      <section className="card">
        <h2 className="text-lg font-semibold text-navy">Help desks</h2>
        <ul className="mt-2 space-y-2">
          {[...SITES.map(s => ({ id: s.id, name: s.name, helper: s.helper })), { id: AUTHORITY.id, name: AUTHORITY.name, helper: 'Coordination desk' }].map(s => (
            <li key={s.id} className="text-base text-navy">
              {s.name}
              <span className="block text-sm text-navy-muted">{s.helper}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-navy-muted mt-3">Any help desk can look up a reference code from any site.</p>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold text-navy">What to bring</h2>
        <ul className="mt-2 space-y-1 text-base text-navy list-disc pl-5">
          <li>Your reference code, if you have one</li>
          <li>A photo of the person, if you have one</li>
          <li>Your own identity document, if you still have it</li>
        </ul>
        <p className="text-sm text-navy-muted mt-3">
          Staff confirm identity and family relationships before they share where someone is. This protects everyone, especially children.
        </p>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold text-navy">If a child is alone</h2>
        <p className="text-base text-navy mt-1">Stay with the child and tell the nearest volunteer or help desk.</p>
      </section>
      <section className="card">
        <h2 className="text-lg font-semibold text-navy">Helpline</h2>
        <p className="text-base text-navy mt-1">Number to be added</p>
        <a href="/phone" className="btn-text -ml-2">
          Or use the voice line (demo)
        </a>
      </section>
    </div>
  </>
);
