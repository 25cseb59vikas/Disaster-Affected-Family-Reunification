import React from 'react';
import { useApp } from './context/AppContext';
import { ChooseSiteScreen } from './screens/ChooseSiteScreen';
import { RegisterChooseTypeScreen } from './screens/RegisterChooseTypeScreen';
import { RegisterSpeakScreen } from './screens/RegisterSpeakScreen';
import { VerifyDetailsScreen } from './screens/VerifyDetailsScreen';
import { SuggestedMatchesScreen } from './screens/SuggestedMatchesScreen';
import { MatchReviewScreen } from './screens/MatchReviewScreen';
import { FamilyStatusPortalScreen } from './screens/FamilyStatusPortalScreen';
import { SearchRecordsScreen } from './screens/SearchRecordsScreen';
import { PriorityCasesScreen } from './screens/PriorityCasesScreen';
import type { ScreenId } from './types';

export const AppContent: React.FC = () => {
  const { currentScreen, navigateTo } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'choose_site':
        return <ChooseSiteScreen />;
      case 'register_choose_type':
        return <RegisterChooseTypeScreen />;
      case 'register_speak':
        return <RegisterSpeakScreen />;
      case 'verify_details':
        return <VerifyDetailsScreen />;
      case 'suggested_matches':
        return <SuggestedMatchesScreen />;
      case 'match_review':
        return <MatchReviewScreen />;
      case 'family_status_portal':
        return <FamilyStatusPortalScreen />;
      case 'search_records':
        return <SearchRecordsScreen />;
      case 'priority_cases':
        return <PriorityCasesScreen />;
      default:
        return <ChooseSiteScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-navy flex flex-col justify-between">
      {/* Quick Screen Switcher Banner for Field testing & evaluation */}
      <nav aria-label="Field preview" className="bg-[#0b1422] text-xs text-white/70 py-1.5 px-3 flex items-center justify-between overflow-x-auto border-b border-navy/40 gap-2">
        <span className="font-semibold text-white/90 whitespace-nowrap">
          Stitch Disaster Prototype:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'choose_site', label: '1. Site' },
            { id: 'register_choose_type', label: '2. Register' },
            { id: 'register_speak', label: '3. Speak' },
            { id: 'verify_details', label: '4. Verify' },
            { id: 'suggested_matches', label: '5. Matches' },
            { id: 'match_review', label: '6. Review' },
            { id: 'family_status_portal', label: '7. Family Portal' },
            { id: 'search_records', label: '8. Search' },
            { id: 'priority_cases', label: '9. Priority' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => navigateTo(s.id as ScreenId)}
              className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                currentScreen === s.id
                  ? 'bg-terracotta text-white font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex-1 flex flex-col">
        {renderScreen()}
      </div>
    </div>
  );
};
