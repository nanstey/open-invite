

export function EventsLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  )
}


