import React from 'react';
import { switchRole } from '../role';

export const FamilyApp: React.FC = () => (
  <main className="p-6">
    <h1 className="screen-title">Family</h1>
    <button type="button" onClick={switchRole} className="btn-text -ml-2">Change how you use Reunite</button>
  </main>
);
