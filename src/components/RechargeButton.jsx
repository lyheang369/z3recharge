export default function RechargeButton({ onClick, isActivating, keyData, hasSession, hasKey }) {
  const isDisabled = isActivating || !hasKey || !hasSession || keyData?.status !== 'available'

  let buttonText = '⚡ Submit Recharge'
  let subText = ''

  if (!hasKey) {
    subText = 'Enter a CDK key first'
  } else if (!keyData) {
    subText = 'Checking key...'
  } else if (keyData?.status === 'activated') {
    subText = 'Key already activated'
    buttonText = '🔵 Already Activated'
  } else if (keyData?.status !== 'available') {
    subText = 'Key not available'
  } else if (!hasSession) {
    subText = 'Enter session JSON'
  }

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`w-full relative overflow-hidden rounded-2xl py-4 px-6 font-bold text-base
                    transition-all duration-300 cursor-pointer
                    ${isDisabled 
                      ? 'bg-dark-600 text-gray-500 cursor-not-allowed border border-dark-500/30' 
                      : 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow'
                    }`}
      >
        {isActivating ? (
          <span className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
            Activating... Please wait
          </span>
        ) : (
          <span className="flex flex-col items-center">
            <span>{buttonText}</span>
            {subText && <span className="text-xs font-normal opacity-60 mt-0.5">{subText}</span>}
          </span>
        )}
        
        {!isDisabled && !isActivating && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
        )}
      </button>
    </div>
  )
}
