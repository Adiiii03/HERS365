import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn';
import { colors } from '../../lib/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, style, ...props },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
          style={{ color: colors.textSecondary }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn('k-input w-full min-h-[44px] px-3.5 py-2.5', className)}
        style={error ? { borderColor: colors.pink, ...style } : style}
        {...props}
      />
      {error && (
        <span id={errorId} className="text-[0.72rem]" style={{ color: colors.pinkText }}>
          {error}
        </span>
      )}
    </div>
  );
});
