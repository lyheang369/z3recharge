export default function Header() {
  return (
    <div className="text-center animate-slide-up">
      <div className="inline-flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25 animate-float">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Recharge Station</h1>
          <p className="text-xs text-gray-500 tracking-widest uppercase">Key Activation System</p>
        </div>
      </div>
    </div>
  )
}
