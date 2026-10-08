import React, { useState } from 'react';

// Stored lower case, the same as the voice extraction and the test data, so matching compares like with like.
export const RELATIONS = [
  'father',
  'mother',
  'husband',
  'wife',
  'son',
  'daughter',
  'brother',
  'sister',
  'grandfather',
  'grandmother',
  'uncle',
  'aunt',
  'neighbour or friend'
];

const OTHER = '__other';

/** Relationship dropdown; anything not in the list (for example from voice) goes in "Other". */
export const RelationSelect: React.FC<{
  id: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}> = ({ id, value, onChange, required, className = '' }) => {
  const normal = value.trim().toLowerCase();
  const listed = RELATIONS.includes(normal);
  const [otherOpen, setOtherOpen] = useState(Boolean(normal) && !listed);
  const selected = listed ? normal : otherOpen ? OTHER : '';

  return (
    <div className="space-y-2">
      <select
        id={id}
        value={selected}
        required={required}
        onChange={e => {
          const v = e.target.value;
          setOtherOpen(v === OTHER);
          onChange(v === OTHER ? '' : v);
        }}
        className={`input capitalize ${className}`}
      >
        <option value="">Choose…</option>
        {RELATIONS.map(r => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
        <option value={OTHER}>Other…</option>
      </select>
      {otherOpen && (
        <input
          aria-label="Other relation"
          placeholder="Type the relation"
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          className={`input ${className}`}
        />
      )}
    </div>
  );
};
