import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { haptics } from '../../lib/haptics';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  'k-btn inline-flex items-center justify-center gap-[7px] font-bold rounded-[9px] ' +
  'cursor-pointer select-none transition-transform disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B3BFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C]';

const variants: Record<ButtonVariant, string> = {
  primary: 'k-btn-primary',
  ghost: 'k-btn-ghost',
  danger:
    'bg-[#FF2E93] text-[#0A0A0C] hover:bg-[#FF6FB3] shadow-[0_2px_16px_rgba(255,46,147,0.22)]',
};

// min-height:44px is enforced by .k-btn; sizes tune horizontal padding + type
// scale, never dropping the tap target below the 44px floor.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3 text-[0.72rem]',
  md: 'min-h-[44px] px-[18px] text-[0.78rem]',
  lg: 'min-h-[52px] px-6 text-[0.85rem]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, onClick, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      style={{ minHeight: 44 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        void haptics.press();
        onClick?.(e);
      }}
      {...props}
    >
      {loading ? <span className="auth-spinner" aria-hidden="true" /> : children}
    </button>
  );
});
