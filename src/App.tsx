import React from 'react';
import { useApp } from './context/AppContext';
import { ChooseSiteScreen } from './screens/ChooseSiteScreen';
import { RegisterChooseTypeScreen } from './screens/RegisterChooseTypeScreen';
import { RegisterSpeakScreen } from './screens/RegisterSpeakScreen';
import { VerifyDetailsScreen } from './screens/VerifyDetailsScreen';
import { SavedScreen } from './screens/SavedScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { RecordDetailScreen } from './screens/RecordDetailScreen';
import { NotificationToast } from './components/Notifications';
import { MatchReviewScreen } from './screens/MatchReviewScreen';
import { SearchRecordsScreen } from './screens/SearchRecordsScreen';
import { RegisterWorkspace } from './screens/RegisterWorkspace';
import { useIsDesktop } from './useIsDesktop';
import type { ScreenId } from './types';

export const AppContent: React.FC = () => {
  const { currentScreen, navigateTo } = useApp();
  const desktop = useIsDesktop();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'choose_site':
        return <ChooseSiteScreen />;
      // Desktop: the three register steps are one workspace.
      case 'register_choose_type':
        return desktop ? <RegisterWorkspace /> : <RegisterChooseTypeScreen />;
      case 'register_speak':
        return desktop ? <RegisterWorkspace /> : <RegisterSpeakScreen />;
      case 'verify_details':
        return desktop ? <RegisterWorkspace useDraft /> : <VerifyDetailsScreen />;
      case 'saved':
        return <SavedScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'record_detail':
        return <RecordDetailScreen />;
      // The volunteer app no longer has Matches or Priority (the authority console reviews and decides).
      case 'suggested_matches':
      case 'priority_cases':
        return <NotificationsScreen />;
      case 'match_review':
        return <MatchReviewScreen />;
      case 'search_records':
        return <SearchRecordsScreen />;
      default:
        return <ChooseSiteScreen />;
    }
  };

  return (
    <>
      {renderScreen()}
      {currentScreen !== 'choose_site' && <NotificationToast />}
      {import.meta.env.DEV && <DebugScreenJump current={currentScreen} onJump={navigateTo} />}
    </>
  );
};

const DEBUG_SCREENS: Array<[ScreenId, string]> = [
  ['choose_site', 'Site'],
  ['register_choose_type', 'Register'],
  ['register_speak', 'Speak'],
  ['verify_details', 'Verify'],
  ['saved', 'Saved'],
  ['notifications', 'Notifications'],
  ['match_review', 'Evidence'],
  ['search_records', 'Search'],
  ['record_detail', 'Record']
];

// Dev-only screen jumper. Hidden by default; open with ?debug=1 or Ctrl+Shift+D.
const DebugScreenJump: React.FC<{ current: ScreenId; onJump: (s: ScreenId) => void }> = ({ current, onJump }) => {
  const [open, setOpen] = React.useState(() => new URLSearchParams(location.search).has('debug'));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;
  return (
    <nav aria-label="Debug screens" className="fixed left-2 bottom-24 z-50 max-w-[calc(100vw-16px)] flex flex-wrap gap-1 p-1.5 rounded-button bg-header/90">
      {DEBUG_SCREENS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onJump(id)}
          className={`px-2 py-1 rounded-badge text-xs ${current === id ? 'bg-terracotta text-white' : 'text-white/80 hover:bg-white/10'}`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
};
