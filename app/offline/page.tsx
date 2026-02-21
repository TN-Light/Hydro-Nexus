"use client"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🌱</div>
        <h1 className="text-3xl font-bold text-green-500 mb-4">
          You&apos;re Offline
        </h1>
        <p className="text-green-300/70 mb-6">
          QBM-HydroNet requires an internet connection to display live sensor
          data. Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Retry Connection
        </button>
        <p className="text-green-300/40 text-sm mt-8">
          Cached dashboard data may still be available once you reconnect.
        </p>
      </div>
    </div>
  )
}
