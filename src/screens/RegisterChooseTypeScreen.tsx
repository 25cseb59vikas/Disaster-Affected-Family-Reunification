import React from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { ChevronRight, Search, UserPlus, type LucideIcon } from 'lucide-react';

const ChoiceCard: React.FC<{ Icon: LucideIcon; title: string; helper: string; path: string; onClick: () => void }> = ({
  Icon,
  title,
  helper,
  path,
  onClick
}) => (
  <button
    type="button"
    data-path={path}
    onClick={onClick}
    className="card w-full min-h-[72px] flex items-center gap-3 text-left cursor-pointer transition-colors hover:border-navy/30 active:bg-pressed"
  >
    <span className="w-10 h-10 shrink-0 rounded-full bg-terracotta-soft text-terracotta flex items-center justify-center">
      <Icon className="icon" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-lg font-semibold text-navy">{title}</span>
      <span className="block text-sm text-navy-muted">{helper}</span>
    </span>
    <ChevronRight className="icon text-navy-muted" />
  </button>
);

export const RegisterChooseTypeScreen: React.FC = () => {
  const { navigateTo, setRegistrationType } = useApp();

  const handleSelectType = (type: 'found' | 'seeking') => {
    setRegistrationType(type);
    navigateTo('register_speak');
  };

  return (
    <Screen nav="register">
      <h1 className="screen-title">Register</h1>
      <div className="card-stack">
        <ChoiceCard
          Icon={UserPlus}
          title="Person found here"
          helper="Someone who has arrived at this site"
          path="register-found"
          onClick={() => handleSelectType('found')}
        />
        <ChoiceCard
          Icon={Search}
          title="Looking for someone"
          helper="A family member is searching"
          path="register-missing"
          onClick={() => handleSelectType('seeking')}
        />
      </div>
    </Screen>
  );
};
