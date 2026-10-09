import React from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { useIsDesktop } from '../useIsDesktop';
import { useConsoleData } from '../workspace/data';
import { EvidencePanel } from '../workspace/EvidencePanel';

/**
 * A match, for a volunteer: the same evidence as the authority console, read-only except for the site's own
 * "Confirm this person is here" and a note to the authority. Accept, Reject and the family check stay in the console.
 */
export const MatchReviewScreen: React.FC = () => {
  const { selectedSuggestionId, site, goBack, canGoBack, navigateTo } = useApp();
  const data = useConsoleData();
  const desktop = useIsDesktop();
  const back = () => (canGoBack ? goBack() : navigateTo('notifications'));

  if (!selectedSuggestionId) {
    return (
      <Screen showBack nav="notifications">
        <h1 className="screen-title">Match</h1>
        <p className="text-base text-navy-muted">No match selected. Open one from Notifications or a record.</p>
      </Screen>
    );
  }

  if (desktop) {
    return (
      <Screen showBack nav="notifications" width="wide" fill>
        {data && <EvidencePanel key={selectedSuggestionId} id={selectedSuggestionId} data={data} mode="site" site={site} />}
      </Screen>
    );
  }

  // Phones and tablets: full screen with a back button and a sticky action bar.
  return (
    <div className="h-dvh">
      {data && <EvidencePanel key={selectedSuggestionId} id={selectedSuggestionId} data={data} variant="full" onBack={back} mode="site" site={site} />}
    </div>
  );
};
