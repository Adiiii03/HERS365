import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  selectable?: boolean;
  selected?: boolean;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { selectable = false, selected = false, className, children, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'k-tag inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium',
        selected
          ? 'border-[rgba(139,59,255,0.3)] bg-[rgba(139,59,255,0.12)] text-[#C4A3FF]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#A0A0AB]',
        selectable && 'cursor-pointer transition-colors hover:border-[rgba(139,59,255,0.2)]',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
});
