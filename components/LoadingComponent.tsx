export default function LoadingComponent() {
  return (
    <main className="max-w-5xl mx-auto flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-7 bg-stone-200/70 rounded-lg w-48 mb-3" />
        <div className="h-4 bg-stone-100 rounded-md w-80 max-w-full" />
      </div>

      {/* Content cards skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-white/60 rounded-2xl border border-stone-200/60 p-5 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-xl bg-stone-100 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-stone-200/70 rounded-md w-2/5" />
                <div className="h-3 bg-stone-100 rounded-md w-3/4" />
              </div>
              <div className="h-8 w-20 bg-stone-100 rounded-lg shrink-0 hidden sm:block" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
