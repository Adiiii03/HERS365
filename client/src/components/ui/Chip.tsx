import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { colors } from '../../lib/tokens';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  selectable?: boolean;
  selected?: boolean;
}

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { selectable = false, selected = false, className, children, style, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cn(
        'k-tag inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium',
        selected
          ? 'border-[rgba(139,59,255,0.3)] bg-[rgba(139,59,255,0.12)]'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]',
        selectable && 'cursor-pointer transition-colors hover:border-[rgba(139,59,255,0.2)]',
        className,
      )}
      style={{ color: selected ? colors.accentText : colors.textSecondary, ...style }}
      {...props}
    >
      {children}
    </span>
  );
});
