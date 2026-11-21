'use client';

// iOS-style segmented control: equal segments, a raised thumb that slides to the selection.
export function Segmented<T extends string>({ options, value, onChange, label, className = '' }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={`seg ${className}`} role="tablist" aria-label={label} style={{ ['--n' as string]: options.length }}>
      <span className="seg-thumb" aria-hidden="true" style={{ transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`seg-opt ${o.value === value ? 'on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
