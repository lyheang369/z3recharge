export default function AccountInfo({ email, keyData, activationStatus }) {
  const statusConfig = {
    available: { color: 'emerald', label: 'Available', icon: '✅' },
    activated: { color: 'sky', label: 'Activated', icon: '🔵' },
    activating: { color: 'amber', label: 'Activating...', icon: '⏳' },
    expired: { color: 'rose', label: 'Expired', icon: '❌' },
  }

  const status = activationStatus || keyData?.status || 'unknown'
  const config = statusConfig[status] || { color: 'gray', label: status, icon: '❓' }

  return (
    <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Account Info</h2>
      </div>

      <div className="space-y-3">
        {/* Email */}
        {email && (
          <div className="flex items-center gap-3 bg-dark-800/50 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-sm text-gray-200 font-medium truncate">{email}</p>
            </div>
          </div>
        )}

        {/* Key Details Grid */}
        {keyData && (
          <div className="grid grid-cols-2 gap-2">
            <InfoCard label="Status" value={`${config.icon} ${config.label}`} color={config.color} />
            {keyData.plan && <InfoCard label="Plan" value={keyData.plan.toUpperCase()} color="purple" />}
            {keyData.service && <InfoCard label="Service" value={keyData.service} color="sky" />}
            {keyData.term && <InfoCard label="Term" value={keyData.term.replace('_', ' ')} color="amber" />}
            {keyData.key_type && <InfoCard label="Type" value={keyData.key_type} color="emerald" />}
            {keyData.subscription_hours && (
              <InfoCard label="Hours" value={`${keyData.subscription_hours}h`} color="rose" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value, color }) {
  const colorMap = {
    purple: 'bg-purple-500/5 border-purple-500/10 text-purple-300',
    emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300',
    sky: 'bg-sky-500/5 border-sky-500/10 text-sky-300',
    amber: 'bg-amber-500/5 border-amber-500/10 text-amber-300',
    rose: 'bg-rose-500/5 border-rose-500/10 text-rose-300',
    gray: 'bg-gray-500/5 border-gray-500/10 text-gray-300',
  }

  return (
    <div className={`rounded-xl px-3 py-2.5 border ${colorMap[color] || colorMap.gray}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs font-semibold capitalize">{value}</p>
    </div>
  )
}
