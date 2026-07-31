import React, { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { hover = false, className, children, ...props },
  ref,
) {
  return (
    <div ref={ref} className={cn(hover ? 'k-card-hover' : 'k-card', className)} {...props}>
      {children}
    </div>
  );
});
