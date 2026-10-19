import { X, Check } from 'lucide-react';
import { Sheet, Button } from '../ui';
import { colors, type as t } from '../../lib/tokens';

// Reusable approval popup for athlete-submitted change requests (stat correction,
// profile photo, school affiliation). One layout, three variants switched by `kind`.
// Spec: output/parent-portal-spec/request-approval-popups.md.
//
// HONESTY (minor-safety surface): there is NO backend for these change requests
// today ([no-endpoint]). This modal is a clearly-flagged DEMO: it carries a
// "demo only" line and Approve/Deny does not write anything. The caller resolves
// the row locally (in-session Recent Activity). Do not wire Approve to a fake
// endpoint or present it as a real change to a minor's profile.

export type ApprovalValue = { label: string } & ({ text: string } | { img: string });

export interface ApprovalRequest {
  id: string;
  kind: 'stat' | 'photo' | 'school';
  subtitle: string; // e.g. "STAT CORRECTION"
  athleteName: string; // "Submitted by {athleteName}"
  description: string;
  current: ApprovalValue;
  next: ApprovalValue;
}

export interface RequestApprovalModalProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  onResolve: (request: ApprovalRequest, action: 'approve' | 'deny') => void;
}

// --- Module-scope sub-components (defining these inside the component body trips
// the "cannot create components during render" lint rule). ---

function ValuePill({ label, accent }: { label: string; accent: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-widest"
      style={{
        background: accent ? 'rgba(139,59,255,0.22)' : colors.surface2,
        color: accent ? colors.accentText : colors.textSecondary,
      }}
    >
      {label}
    </span>
  );
}

function ValueCard({ value, accent, caption }: { value: ApprovalValue; accent: boolean; caption: string }) {
  const isImg = 'img' in value;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full rounded-2xl p-4 flex items-center justify-center min-h-[128px]"
        style={{
          background: accent ? 'rgba(139,59,250,0.10)' : colors.surface2,
          border: `1px solid ${accent ? 'rgba(139,59,255,0.45)' : colors.border}`,
        }}
      >
        <span className="absolute top-3 right-3">
          <ValuePill label={value.label} accent={accent} />
        </span>
        {isImg ? (
          <img
            src={value.img}
            alt=""
            className="w-24 h-24 rounded-full object-cover"
            style={{ border: `2px solid ${accent ? colors.accent : colors.border}` }}
          />
        ) : (
          <span
            className="text-3xl font-[800] leading-none text-center break-words"
            style={{ fontFamily: t.font.display, color: accent ? '#fff' : colors.textSecondary }}
          >
            {value.text}
          </span>
        )}
      </div>
      <span className="mt-2 text-xs" style={{ color: colors.textTertiary }}>{caption}</span>
    </div>
  );
}

export const RequestApprovalModal = ({ request, onClose, onResolve }: RequestApprovalModalProps) => {
  const open = request !== null;
  const isPhoto = request?.kind === 'photo';
  return (
    <Sheet open={open} onClose={onClose} placement="center" label={request ? `Request: ${request.subtitle}` : undefined}>
      {request && (
        <div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-[800] uppercase leading-none text-white" style={{ fontFamily: t.font.display }}>
              Request:
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ background: colors.surface2, color: colors.textSecondary }}
            >
              <X size={16} />
            </button>
          </div>

          <p className="mt-3 text-sm font-black uppercase tracking-widest" style={{ color: colors.accentText }}>
            {request.subtitle}
          </p>
          <p className="mt-1 text-xs" style={{ color: colors.textTertiary }}>
            Submitted by {request.athleteName}
          </p>
          <p className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
            {request.description}
          </p>

          <p className="mt-5 mb-3 text-xs font-black uppercase tracking-widest" style={{ color: colors.textTertiary }}>
            Current vs. New
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ValueCard value={request.current} accent={false} caption={isPhoto ? 'Current photo' : 'Current value'} />
            <ValueCard value={request.next} accent caption={isPhoto ? 'Proposed photo' : 'Proposed value'} />
          </div>

          {/* Honesty marker — this is a demo, approving writes nothing. */}
          <p className="mt-4 text-[0.7rem] leading-snug" style={{ color: colors.textTertiary }}>
            Demo only — approving does not change your athlete&rsquo;s live profile yet.
          </p>

          <div className="mt-4 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => onResolve(request, 'deny')}>
              <X size={15} /> Deny
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => onResolve(request, 'approve')}>
              <Check size={15} /> Approve
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
};

export default RequestApprovalModal;
