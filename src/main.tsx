import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { AppContent } from './App';
import { FamilyStatusPage } from './screens/FamilyStatusPage';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* The public family page stands alone: no volunteer state, no sync. */}
    {location.pathname.startsWith('/status') ? (
      <FamilyStatusPage />
    ) : (
      <AppProvider>
        <AppContent />
      </AppProvider>
    )}
  </React.StrictMode>
);
