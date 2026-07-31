import { Skeleton } from '../Skeleton';

// Stat tile placeholder — matches the .k-stat-block footprint so cold loads
// don't show a wall of zeros.
export function StatCardSkeleton() {
  return (
    <div className="k-stat-block" role="status" aria-busy="true">
      <Skeleton width={56} height={28} radius={8} />
      <div style={{ marginTop: 8 }}>
        <Skeleton width={40} height={9} radius={4} />
      </div>
    </div>
  );
}

// List row placeholder — avatar + two lines of text.
export function RowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 py-3"
      role="status"
      aria-busy="true"
    >
      <Skeleton width={40} height={40} radius={9999} />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton width="60%" height={12} />
        <Skeleton width="40%" height={10} />
      </div>
    </div>
  );
}

// Card placeholder — header line plus a short body block.
export function CardSkeleton() {
  return (
    <div className="k-card p-4" role="status" aria-busy="true">
      <Skeleton width="50%" height={14} />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="100%" height={10} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton width="80%" height={10} />
      </div>
    </div>
  );
}
