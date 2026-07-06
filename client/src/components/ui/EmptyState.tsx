import React from 'react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  cta?: React.ReactNode;
  className?: string;
}

// Mirrors the best existing empty state (CoachRoster.tsx:287-298): centered
// icon, title, supporting copy, optional CTA — on brand tokens.
export function EmptyState({ icon, title, body, cta, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      {icon && <div className="mb-4 text-[#6B6B76]">{icon}</div>}
      <h3 className="mb-2 text-xl font-medium text-[#F5F5F7]">{title}</h3>
      {body && <p className="mb-6 max-w-sm text-[0.85rem] text-[#A0A0AB]">{body}</p>}
      {cta}
    </div>
  );
}
