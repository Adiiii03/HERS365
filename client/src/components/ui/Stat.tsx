import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';
import { colors, type as t } from '../../lib/tokens';

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
}

export const Stat = forwardRef<HTMLDivElement, StatProps>(function Stat(
  { label, value, className, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn('k-stat-block', className)} {...props}>
      <div
        className="tnum font-[800] leading-none"
        style={{ fontFamily: t.font.display, fontSize: '1.5rem', color: colors.accent }}
      >
        {value}
      </div>
      <div
        className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em]"
        style={{ color: colors.textTertiary }}
      >
        {label}
      </div>
    </div>
  );
});
