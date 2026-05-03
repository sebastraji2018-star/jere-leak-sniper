export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-[#1a1a1a] rounded-lg mb-2" />
          <div className="h-4 w-64 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-10 w-36 bg-[#1a1a1a] rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-4 h-24" />
        ))}
      </div>
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-6 h-16" />
      <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl h-64" />
    </div>
  )
}
