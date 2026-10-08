import React from 'react';
import { switchRole } from '../role';

export const ConsoleApp: React.FC = () => (
  <main className="p-6">
    <h1 className="screen-title">Authority console</h1>
    <button type="button" onClick={switchRole} className="btn-text -ml-2">Change how you use Reunite</button>
  </main>
);
