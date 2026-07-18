export default function ShopLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#faf7f2' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="skeleton rounded-2xl h-40 md:h-56 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white border border-stone-100">
              <div className="skeleton aspect-square" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-3.5 rounded-full w-full" />
                <div className="skeleton h-3.5 rounded-full w-2/3" />
                <div className="flex items-center justify-between pt-1">
                  <div className="skeleton h-4 rounded-full w-12" />
                  <div className="skeleton h-6 rounded-full w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
