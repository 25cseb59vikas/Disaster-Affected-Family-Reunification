import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { AppContent } from './App';
import { FamilyStatusPage } from './screens/FamilyStatusPage';
import { PhoneLinePage } from './screens/PhoneLinePage';
import { RolePickerPage } from './screens/RolePickerPage';
import { ConsoleApp } from './console/ConsoleApp';
import { FamilyApp } from './family/FamilyApp';
import { deviceRole, ROLE_HOME } from './role';
import './components/InstallButton'; // starts listening for the browser's install prompt
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import './index.css';
import { refreshSites } from './sites';
void refreshSites();
window.setInterval(() => { void refreshSites(); }, 15000);

function Root() {
  const path = location.pathname;
  // Stand-alone pages: no volunteer state, no site sync.
  if (path.startsWith('/status')) return <FamilyStatusPage />;
  if (path.startsWith('/phone')) return <PhoneLinePage />;
  if (path.startsWith('/console')) return <ConsoleApp />;
  if (path.startsWith('/family')) return <FamilyApp />;

  const role = deviceRole();
  if (!role) return <RolePickerPage />;
  if (role !== 'volunteer') {
    location.replace(ROLE_HOME[role]);
    return null;
  }
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
