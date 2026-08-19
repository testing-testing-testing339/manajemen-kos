export default function DashboardLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex justify-between items-center pb-2">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200/80 rounded-2xl" />
          <div className="h-4 w-96 bg-slate-200/60 rounded-xl" />
        </div>
        <div className="h-9 w-36 bg-slate-200/70 rounded-xl" />
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-slate-200/80 rounded-lg" />
              <div className="w-8 h-8 rounded-xl bg-slate-200/70" />
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded-xl" />
            <div className="h-3 w-20 bg-slate-200/50 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="h-5 w-48 bg-slate-200/80 rounded-xl" />
          <div className="h-9 w-64 bg-slate-200/60 rounded-xl" />
        </div>

        {/* Table rows skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="h-12 bg-slate-100/70 rounded-2xl w-full flex items-center justify-between px-4">
              <div className="h-4 w-36 bg-slate-200/80 rounded-lg" />
              <div className="h-4 w-24 bg-slate-200/60 rounded-lg" />
              <div className="h-4 w-20 bg-slate-200/60 rounded-lg" />
              <div className="h-6 w-16 bg-slate-200/80 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
