import React from 'react';
import { cn } from '../../lib/cn';
import { colors } from '../../lib/tokens';

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
      {icon && <div className="mb-4" style={{ color: colors.textTertiary }}>{icon}</div>}
      <h3 className="mb-2 text-xl font-medium" style={{ color: colors.textPrimary }}>{title}</h3>
      {body && (
        <p className="mb-6 max-w-sm text-[0.85rem]" style={{ color: colors.textSecondary }}>
          {body}
        </p>
      )}
      {cta}
    </div>
  );
}
