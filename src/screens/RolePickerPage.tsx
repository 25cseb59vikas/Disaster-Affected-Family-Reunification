import React from 'react';
import { ArrowRight, ChevronRight, HeartHandshake, LayoutDashboard, Tent, type LucideIcon } from 'lucide-react';
import { chooseRole, type Role } from '../role';
import { InstallButton } from '../components/InstallButton';
import { DemoNotice } from '../components/DemoNotice';

const CHOICES: Array<{ role: Role; Icon: LucideIcon; title: string; helper: string }> = [
  { role: 'volunteer', Icon: Tent, title: 'Camp or hospital volunteer', helper: 'Register people and confirm matches at your site' },
  { role: 'console', Icon: LayoutDashboard, title: 'Authority console', helper: 'All sites: match queue, decisions, records' },
  { role: 'family', Icon: HeartHandshake, title: 'Family member', helper: 'Report a missing person or check a search' }
];

/**
 * First screen on a new device. The choice is remembered; every part of the app has a way back here.
 * The same look as the family site: a navy header with the contour texture, then three raised cards.
 */
export const RolePickerPage: React.FC = () => (
  <div className="min-h-dvh bg-canvas bg-dotgrid flex flex-col">
    <header className="bg-header bg-topo-dark text-white">
      <div className="mx-auto w-full max-w-5xl px-4 lg:px-8 pt-6 pb-8 lg:pt-16 lg:pb-24">
        <p className="font-display text-lg font-semibold tracking-tight">Reunite</p>
        <h1 className="mt-4 lg:mt-10 font-display text-title lg:text-metric font-semibold tracking-tight leading-tight">How are you using Reunite?</h1>
        <p className="mt-2 text-base text-white/75 max-w-xl">Family reunification after a disaster, working offline first.</p>
      </div>
    </header>
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-4 lg:px-8 lg:py-0 lg:-mt-14">
      <div className="grid gap-3 md:grid-cols-3 lg:gap-5 [&>*]:min-w-0">
        {CHOICES.map(({ role, Icon, title, helper }) => (
          <button
            key={role}
            type="button"
            onClick={() => chooseRole(role)}
            className="group card md:panel md:shadow-raised w-full min-h-[72px] flex items-center md:flex-col md:items-start gap-3 md:p-6 text-left cursor-pointer hover:border-navy/30 md:hover:shadow-overlay active:bg-pressed motion-safe:transition-shadow motion-safe:duration-150"
          >
            <span className="w-10 h-10 md:w-11 md:h-11 shrink-0 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
              <Icon className="icon" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-lg md:font-display md:text-xl font-semibold tracking-tight text-navy">{title}</span>
              <span className="block text-sm text-navy-muted md:mt-1">{helper}</span>
            </span>
            <ChevronRight className="icon text-navy-muted md:hidden" />
            <span className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-terracotta">
              Continue
              <ArrowRight className="w-4 h-4 motion-safe:transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-navy-muted mt-4 lg:mt-6">This device remembers your choice. You can change it later.</p>
      <InstallButton className="mt-4 self-start" />
    </main>
    <DemoNotice />
  </div>
);
