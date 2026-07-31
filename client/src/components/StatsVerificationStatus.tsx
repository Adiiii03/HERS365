import { Badge } from './ui/Badge';

/** Clear coach-facing label for self-reported vs HERS365-confirmed stats. */
export function StatsVerificationStatus({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge tone="neon" title="Stats confirmed by HERS365">
        🟢 Verified by HERS365
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" title="Self-reported stats awaiting confirmation">
      Status: Pending Verification
    </Badge>
  );
}
