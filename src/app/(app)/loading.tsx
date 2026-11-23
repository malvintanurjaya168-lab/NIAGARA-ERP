import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-3 w-full max-w-xl" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-soft"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="mt-4 h-6 w-24" />
            <Skeleton className="mt-2 h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft xl:col-span-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-2 h-2.5 w-64" />
          <Skeleton className="mt-6 h-[280px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-soft">
          <Skeleton className="h-3.5 w-32" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="size-6 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
