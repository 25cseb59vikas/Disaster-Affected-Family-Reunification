import React from 'react';
import { useApp } from '../context/AppContext';
import { Screen } from '../components/Screen';
import { IntakeChooser } from '../intake/IntakeChooser';

export const RegisterSpeakScreen: React.FC = () => {
  const { navigateTo, registrationType, setVoiceDraft } = useApp();
  const title = registrationType === 'found' ? 'Person found here' : 'Looking for someone';

  return (
    <Screen showBack width="wide">
      <h1 className="screen-title">{title}</h1>
      <IntakeChooser
        type={registrationType}
        onDone={draft => {
          setVoiceDraft(draft);
          navigateTo('verify_details');
        }}
      />
    </Screen>
  );
};
