import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, CheckCircle2, ChevronRight, LifeBuoy, Phone, Search, UserSearch, type LucideIcon } from 'lucide-react';
import type { VoiceDraft } from '../context/AppContext';
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

/** /family: report a missing person, check a report, get help or call. Phone layout, no camp login. */
export const FamilyApp: React.FC = () => {
  const { path, params } = useRoute();
  const waiting = useSender();

  let page: React.ReactNode;
  if (path.startsWith('/family/report')) page = <ReportPage />;
  else if (path.startsWith('/family/status')) page = <StatusPage code={params.get('code') ?? ''} />;
  else if (path.startsWith('/family/help')) page = <HelpPage />;
  else page = <HomePage />;

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <header className="bg-header text-white">
        <div className="mx-auto max-w-app px-4 h-header flex items-center gap-2">
          <a {...linkProps('/family')} className="flex-1 min-w-0">
            <span className="block text-base font-semibold">Reunite</span>
            <span className="block text-xs text-white/70">For families</span>
          </a>
          {waiting > 0 && <span className="text-xs text-white/80">{waiting} waiting to send</span>}
        </div>
      </header>
      <main className="flex-1 w-full max-w-app mx-auto px-4 py-4">{page}</main>
      <div className="w-full max-w-app mx-auto px-4 pb-2 flex flex-wrap items-center gap-x-3">
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

const HomePage: React.FC = () => {
  const mine = useLiveQuery(() => db.records.orderBy('created_at').reverse().toArray(), [], [] as PersonRecord[]);
  return (
    <>
      <h1 className="screen-title">How can we help?</h1>
      <div className="card-stack">
        <Choice href="/family/report" Icon={UserSearch} title="Report a missing person" helper="Tell us who you are looking for" />
        <Choice href="/family/status" Icon={Search} title="Check status" helper="Use the reference code you were given" />
        <Choice href="/family/help" Icon={LifeBuoy} title="Get help" helper="Help desks and what to bring" />
        <Choice href="/phone" Icon={Phone} title="Call instead" helper="Answer a few questions by voice (demo line)" external />
      </div>

      {mine.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-navy-muted mb-2">Reported from this phone</h2>
          <div className="card-stack">
            {mine.map(r => (
              <a key={r.id} {...linkProps(`/family/status?code=${encodeURIComponent(r.code)}`)} className="card flex items-center gap-3 hover:border-navy/30">
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

const ReportPage: React.FC = () => {
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
      <>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="icon text-verified" />
          <h1 className="text-xl font-semibold text-navy">Report saved</h1>
        </div>
        <div className="card">
          <p className="text-sm text-navy-muted">Your reference code</p>
          <p className="text-xl font-semibold text-navy tracking-wide">{saved.code}</p>
          <p className="text-sm text-navy-muted mt-1">Write it down. Use it to check the search here or at any help desk.</p>
          <p className="text-base text-navy mt-3">{sent ? 'Sent to the relief teams.' : 'Saved on this phone. It will be sent when there is a connection.'}</p>
        </div>
        <a {...linkProps(`/family/status?code=${encodeURIComponent(saved.code)}`)} className="btn-primary mt-4">
          Check status
        </a>
        <a {...linkProps('/family')} className="btn-text -ml-2 mt-2">
          Back to the start
        </a>
      </>
    );
  }

  if (!draft) {
    return (
      <>
        <Back />
        <h1 className="screen-title">Who are you looking for?</h1>
        <p className="text-sm text-navy-muted -mt-2 mb-4">Speak, take a photo, or type. You can check and change everything next.</p>
        <IntakeChooser type="seeking" onDone={setDraft} />
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setDraft(null)} className="btn-text -ml-2 mb-2 gap-1">
        <ArrowLeft className="w-5 h-5" strokeWidth={1.75} /> Back
      </button>
      <h1 className="screen-title">Check the details</h1>
      <DetailsForm formId="family-report" type="seeking" draft={draft} variant="family" onSave={save} />
      <button type="submit" form="family-report" disabled={saving} className="btn-primary mt-6">
        {saving ? 'Saving…' : 'Send report'}
      </button>
      <p className="text-sm text-navy-muted mt-2">Only relief staff see your report. You will get a reference code to check its status.</p>
    </>
  );
};

const StatusPage: React.FC<{ code: string }> = ({ code }) => (
  <>
    <Back />
    <h1 className="screen-title">Check status</h1>
    <StatusChecker
      key={code}
      initialCode={code}
      onUrl={c => history.replaceState(null, '', `/family/status?code=${encodeURIComponent(c)}`)}
    />
  </>
);

const HelpPage: React.FC = () => (
  <>
    <Back />
    <h1 className="screen-title">Get help</h1>
    <section className="card mb-3">
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
    <section className="card mb-3">
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
    <section className="card mb-3">
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
  </>
);
