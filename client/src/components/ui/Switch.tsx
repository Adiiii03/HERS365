import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

// Accessible on/off toggle (role="switch"), purple accent. Extracted from the
// CoachSettings inline pattern so the parent portal (Privacy, Settings) share one
// control instead of re-implementing it per page.
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, disabled = false, label, id, className },
  ref,
) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 flex-shrink-0',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(139,59,255,0.5)]',
        'disabled:opacity-40 disabled:pointer-events-none',
        checked ? 'bg-[#8B3BFF]' : 'bg-surface-hover border border-white/10',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
});
