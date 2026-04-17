import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import BackgroundEffects from '../components/BackgroundEffects'
import {
  initializeAuth,
  verifyLogin,
  getAuthConfig,
  generateTOTP,
  getTOTPTimeRemaining,
  getTOTPUri,
  isAuthenticated,
} from '../utils/auth'

// ─── 2FA Setup Screen (shown on first login) ────────────────────────────────
function TotpSetup({ secret, onContinue }) {
  const [code, setCode] = useState('')
  const [timeLeft, setTimeLeft] = useState(getTOTPTimeRemaining())
  const [currentCode, setCurrentCode] = useState('')
  const [copied, setCopied] = useState(false)
  const uri = getTOTPUri(secret)

  // Tick the countdown & regenerate the demo code
  useEffect(() => {
    let mounted = true
    const tick = async () => {
      if (!mounted) return
      setTimeLeft(getTOTPTimeRemaining())
      setCurrentCode(await generateTOTP(secret))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => { mounted = false; clearInterval(id) }
  }, [secret])

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyUri = () => {
    navigator.clipboard.writeText(uri)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Setup Two-Factor Authentication</h2>
        <p className="text-xs text-gray-400 mt-1">Add this secret to your authenticator app (Google Authenticator, Authy, etc.)</p>
      </div>

      {/* Secret key display */}
      <div className="bg-dark-800/80 rounded-xl p-4 border border-dark-500/50">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Secret Key</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm text-purple-300 font-mono break-all select-all leading-relaxed">{secret}</code>
          <button onClick={copySecret} className="shrink-0 p-2 rounded-lg hover:bg-dark-600/50 transition-colors cursor-pointer" title="Copy secret">
            {copied ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* OTPAuth URI */}
      <div className="bg-dark-800/80 rounded-xl p-4 border border-dark-500/50">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">OTPAuth URI</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-sky-300 font-mono break-all select-all leading-relaxed">{uri}</code>
          <button onClick={copyUri} className="shrink-0 p-2 rounded-lg hover:bg-dark-600/50 transition-colors cursor-pointer" title="Copy URI">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          </button>
        </div>
      </div>

      {/* Live preview */}
      <div className="bg-dark-800/80 rounded-xl p-4 border border-dark-500/50">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Code (Preview)</label>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-mono font-bold text-white tracking-[0.3em]">{currentCode}</span>
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke={timeLeft <= 5 ? '#fb7185' : '#8b5cf6'}
                  strokeWidth="3" strokeDasharray={`${(timeLeft / 30) * 88} 88`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${timeLeft <= 5 ? 'text-rose-400' : 'text-purple-300'}`}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verify before continuing */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Verify — Enter Current 2FA Code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-3 text-center text-lg
                     text-white placeholder-gray-600 outline-none transition-all duration-300 font-mono tracking-[0.4em]
                     focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
        />
      </div>

      <button
        onClick={() => code.length === 6 && onContinue(code)}
        disabled={code.length !== 6}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer
                   bg-gradient-to-r from-emerald-600 to-emerald-700 text-white
                   hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
      >
        Verify & Continue to Login
      </button>
    </div>
  )
}

// ─── Login Form ──────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [timeLeft, setTimeLeft] = useState(getTOTPTimeRemaining())
  const [lockout, setLockout] = useState(null)

  // Countdown timer for TOTP & lockout
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTOTPTimeRemaining())
      // Check lockout
      const cfg = getAuthConfig()
      if (cfg?.lockedUntil && Date.now() < cfg.lockedUntil) {
        setLockout(Math.ceil((cfg.lockedUntil - Date.now()) / 1000))
      } else {
        setLockout(null)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim() || totpCode.length !== 6) return
    if (lockout) return

    setLoading(true)
    setError('')

    try {
      await verifyLogin(username.trim(), password, totpCode)
      onSuccess()
    } catch (err) {
      setError(err.message)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  const isLocked = lockout !== null

  return (
    <form onSubmit={handleSubmit}
      className={`space-y-4 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
    >
      {/* Lockout banner */}
      {isLocked && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-3">
          <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-rose-300">Account Locked</p>
            <p className="text-xs text-rose-400/80">Too many failed attempts. Try again in {lockout}s</p>
          </div>
        </div>
      )}

      {/* Username */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Username
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); setError('') }}
            placeholder="Enter username"
            autoComplete="username"
            disabled={isLocked}
            className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl pl-10 pr-4 py-3 text-sm
                       text-gray-200 placeholder-gray-600 outline-none transition-all duration-300
                       focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Password
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            placeholder="Enter password"
            autoComplete="current-password"
            disabled={isLocked}
            className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl pl-10 pr-11 py-3 text-sm
                       text-gray-200 placeholder-gray-600 outline-none transition-all duration-300
                       focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 2FA Code */}
      <div>
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          <span className="flex items-center justify-between">
            <span>2FA Code</span>
            <span className="flex items-center gap-1.5">
              <span className="relative w-5 h-5">
                <svg className="w-5 h-5 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke={timeLeft <= 5 ? '#fb7185' : '#8b5cf6'}
                    strokeWidth="2.5" strokeDasharray={`${(timeLeft / 30) * 88} 88`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${timeLeft <= 5 ? 'text-rose-400' : 'text-purple-300'}`}>
                  {timeLeft}
                </span>
              </span>
            </span>
          </span>
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={totpCode}
            onChange={e => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            placeholder="000000"
            autoComplete="one-time-code"
            disabled={isLocked}
            className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl pl-10 pr-4 py-3 text-sm text-center
                       text-gray-200 placeholder-gray-600 outline-none transition-all duration-300 font-mono tracking-[0.3em]
                       focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || isLocked || !username.trim() || !password.trim() || totpCode.length !== 6}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer
                   bg-gradient-to-r from-purple-600 to-purple-700 text-white
                   hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98]
                   disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
            Authenticating...
          </span>
        ) : 'Sign In'}
      </button>

      {/* Security info */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          SHA-256 Hashed
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          TOTP RFC 6238
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          8h Session
        </span>
      </div>
    </form>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminLogin() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading') // loading | setup | login
  const [totpSecret, setTotpSecret] = useState('')

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      // Already logged in?
      if (isAuthenticated()) {
        navigate('/admin', { replace: true })
        return
      }

      const config = await initializeAuth()
      if (!mounted) return

      // Check if this looks like first-time setup (no previous logins)
      // We detect this by checking if the config was just created (within 2s)
      const created = new Date(config.createdAt).getTime()
      const isNew = Date.now() - created < 2000

      if (isNew) {
        setTotpSecret(config.totpSecret)
        setPhase('setup')
      } else {
        setPhase('login')
      }
    })()
    return () => { mounted = false }
  }, [navigate])

  const handleSetupComplete = useCallback(async (code) => {
    // Verify the code matches before allowing to proceed
    const config = getAuthConfig()
    const expected = await generateTOTP(config.totpSecret)
    if (code === expected) {
      setPhase('login')
    }
  }, [])

  const handleLoginSuccess = useCallback(() => {
    navigate('/admin', { replace: true })
  }, [navigate])

  if (phase === 'loading') {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <BackgroundEffects />
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin-slow" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <BackgroundEffects />
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/30 mb-4 animate-float">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">
            {phase === 'setup' ? 'Security Setup' : 'Admin Access'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {phase === 'setup'
              ? 'Configure your two-factor authentication'
              : 'Username + Password + 2FA required'}
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">
          {phase === 'setup' ? (
            <TotpSetup secret={totpSecret} onContinue={handleSetupComplete} />
          ) : (
            <LoginForm onSuccess={handleLoginSuccess} />
          )}
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-gray-600 mt-4">
          <Link to="/" className="text-purple-400 hover:text-purple-300 transition-colors">
            ← Back to Recharge
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
