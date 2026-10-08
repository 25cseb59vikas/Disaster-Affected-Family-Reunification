import React from 'react';

/** Footer notice shown on the console, the family app and the first screen. */
export const DemoNotice: React.FC<{ className?: string }> = ({ className = '' }) => (
  <footer className={`px-4 py-3 border-t border-borderSlate text-xs text-navy-muted text-center ${className}`}>
    Demo uses fictional information. Do not enter real personal data. Device storage is not encrypted in this prototype.
  </footer>
);
