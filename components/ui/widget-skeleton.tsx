import { Skeleton } from '@/components/ui/skeleton';

export function PriceCardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-3 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <>
      <Skeleton className="aspect-2/1 w-full" />
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}
