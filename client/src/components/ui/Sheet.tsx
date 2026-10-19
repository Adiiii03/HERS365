import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { colors } from '../../lib/tokens';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
  // 'bottom' (default) = mobile-style bottom sheet; 'center' = centered dialog
  // (fade/scale in, no drag handle, all corners rounded) for modals like the
  // approval popups. Focus-trap / Esc / scroll-lock / backdrop-close are shared.
  placement?: 'bottom' | 'center';
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Sheet({ open, onClose, children, className, label, placement = 'bottom' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const centered = placement === 'center';

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100] flex justify-center',
            centered ? 'items-center p-4' : 'items-end',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(
              'relative w-full max-w-[560px] border ' +
                'shadow-[inset_0_1px_0_0_rgba(255,255,255,.08),0_24px_64px_-16px_rgba(0,0,0,.8)]',
              centered
                ? 'rounded-[24px] p-5 max-h-[90vh] overflow-y-auto'
                : 'rounded-t-[24px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
              className,
            )}
            style={{ borderColor: colors.border, background: colors.surface1 }}
            initial={reduce ? { opacity: 0 } : centered ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : centered ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : centered ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            transition={
              reduce
                ? { duration: 0 }
                : centered
                  ? { duration: 0.18, ease: 'easeOut' }
                  : { type: 'spring', stiffness: 380, damping: 34 }
            }
          >
            {!centered && (
              <div
                aria-hidden="true"
                className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/15"
              />
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
