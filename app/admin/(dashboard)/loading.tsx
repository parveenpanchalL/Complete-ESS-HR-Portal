export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-48" />
        <div className="h-4 bg-gray-100 rounded w-64" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="border border-gray-200 rounded-md p-4 bg-white space-y-2">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-7 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>

      <div className="border border-gray-200 rounded-md bg-white p-6 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-32" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
