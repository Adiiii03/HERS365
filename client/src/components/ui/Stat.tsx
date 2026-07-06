import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

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
        className="tnum font-[800] leading-none text-[#8B3BFF]"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.5rem' }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#6B6B76]">
        {label}
      </div>
    </div>
  );
});
