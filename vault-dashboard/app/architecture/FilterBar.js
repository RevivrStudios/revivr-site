'use client';

// Chip keys must match FILTER_PREDICATES in BusinessMapCanvas.
const CHIPS = [
  { key: 'quinn', label: 'Quinn' },
  { key: 'quell', label: 'Quell' },
  { key: 'shared', label: 'Shared' },
  { key: 'operations', label: 'Operations' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'projects', label: 'Projects' },
  { key: 'obsidian', label: 'Obsidian' },
  { key: 'external', label: 'External Tools' },
];

export default function FilterBar({ active, onToggle }) {
  return (
    <div className="arch-filterbar">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          className={`arch-filter-chip chip-${key} ${active.has(key) ? 'on' : ''}`}
          onClick={() => onToggle(key)}
          aria-pressed={active.has(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
