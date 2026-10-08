import React from 'react';
import { ChevronRight, HeartHandshake, LayoutDashboard, Tent, type LucideIcon } from 'lucide-react';
import { chooseRole, type Role } from '../role';
import { InstallButton } from '../components/InstallButton';
import { DemoNotice } from '../components/DemoNotice';

const CHOICES: Array<{ role: Role; Icon: LucideIcon; title: string; helper: string }> = [
  { role: 'volunteer', Icon: Tent, title: 'Camp or hospital volunteer', helper: 'Register people and review matches at your site' },
  { role: 'console', Icon: LayoutDashboard, title: 'Authority console', helper: 'All sites: match queue, decisions, records' },
  { role: 'family', Icon: HeartHandshake, title: 'Family member', helper: 'Report a missing person or check a search' }
];

/** First screen on a new device. The choice is remembered; every part of the app has a way back here. */
export const RolePickerPage: React.FC = () => (
  <div className="min-h-dvh bg-canvas flex flex-col">
    <header className="bg-header text-white">
      <div className="mx-auto max-w-5xl px-4 lg:px-8 py-5">
        <p className="text-xl font-semibold">Reunite</p>
        <p className="text-sm text-white/70">Family reunification after a disaster, working offline first</p>
      </div>
    </header>
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 lg:px-8 lg:flex lg:flex-col lg:justify-center lg:pb-24">
      <h1 className="screen-title">How are you using Reunite?</h1>
      <div className="grid gap-3 md:grid-cols-3 [&>*]:min-w-0">
        {CHOICES.map(({ role, Icon, title, helper }) => (
          <button
            key={role}
            type="button"
            onClick={() => chooseRole(role)}
            className="card w-full min-h-[72px] flex items-center md:flex-col md:items-start gap-3 lg:p-6 lg:gap-4 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
          >
            <span className="w-10 h-10 shrink-0 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
              <Icon className="icon" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-lg font-semibold text-navy">{title}</span>
              <span className="block text-sm text-navy-muted">{helper}</span>
            </span>
            <ChevronRight className="icon text-navy-muted md:hidden" />
          </button>
        ))}
      </div>
      <p className="text-sm text-navy-muted mt-4">This device remembers your choice. You can change it later.</p>
      <InstallButton className="mt-4 self-start" />
    </main>
    <DemoNotice />
  </div>
);
