import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

// neon is reserved for verified / live signals only — never decorative.
type BadgeTone = 'accent' | 'pink' | 'neon' | 'neutral' | 'success';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

// Shape reuses .k-badge-* / .k-pos-badge spec: 0.65rem/700, 3px 8px, radius 5px,
// 10%-alpha fill with a 15%-alpha border in the tone hue.
const shape =
  'inline-flex items-center rounded-[5px] border px-2 py-[3px] text-[0.65rem] font-bold leading-none';

const tones: Record<BadgeTone, string> = {
  accent: 'bg-[rgba(139,59,255,0.1)] text-[#C4A3FF] border-[rgba(139,59,255,0.15)]',
  pink: 'bg-[rgba(255,46,147,0.1)] text-[#FF6FB3] border-[rgba(255,46,147,0.15)]',
  neon: 'bg-[rgba(57,255,20,0.1)] text-[#39FF14] border-[rgba(57,255,20,0.2)]',
  success: 'bg-[rgba(74,222,128,0.1)] text-[#4ade80] border-[rgba(74,222,128,0.15)]',
  neutral: 'bg-[rgba(255,255,255,0.05)] text-[#A0A0AB] border-[rgba(255,255,255,0.08)]',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', className, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(shape, tones[tone], className)} {...props}>
      {children}
    </span>
  );
});
