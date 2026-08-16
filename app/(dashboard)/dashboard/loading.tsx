// CANONICAL dashboard loading skeleton.
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
    </div>
  );
}
