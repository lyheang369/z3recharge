import { useState, useRef, useCallback, useEffect } from 'react'
import { apiUrl } from '../utils/api'

export default function KeyChecker({ onKeyChecked, onKeyCodeChange, showToast }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)
  const debounceRef = useRef(null)

  const checkKey = useCallback(async (keyCode) => {
    if (!keyCode || keyCode.length < 3) return
    
    setLoading(true)
    setChecked(false)
    
    try {
      const res = await fetch(apiUrl(`/api/keys/${encodeURIComponent(keyCode)}`))
      const data = await res.json()
      
      if (data.error) {
        showToast(data.error, 'error')
        onKeyChecked(null)
      } else {
        onKeyChecked(data)
        const statusMsg = data.status === 'available' 
          ? '✅ Key is available!' 
          : data.status === 'activated' 
            ? '🔵 Key already activated' 
            : `Key status: ${data.status}`
        showToast(statusMsg, data.status === 'available' ? 'success' : 'info')
      }
      setChecked(true)
    } catch {
      showToast('Failed to check key. Please try again.', 'error')
      onKeyChecked(null)
    } finally {
      setLoading(false)
    }
  }, [onKeyChecked, showToast])

  const handleChange = useCallback((e) => {
    const value = e.target.value.trim()
    setCode(value)
    onKeyCodeChange(value)
    setChecked(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.length >= 3) {
      debounceRef.current = setTimeout(() => {
        checkKey(value)
      }, 400)
    } else {
      onKeyChecked(null)
    }
  }, [checkKey, onKeyCodeChange, onKeyChecked])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">CDK Key</h2>
        {loading && (
          <div className="ml-auto">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin-slow" />
          </div>
        )}
        {checked && !loading && (
          <div className="ml-auto">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>
      
      <div className="relative">
        <input
          type="text"
          value={code}
          onChange={handleChange}
          placeholder="Enter your CDK key code..."
          className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 
                     placeholder-gray-600 outline-none transition-all duration-300
                     focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 focus:bg-dark-800
                     font-mono tracking-wide"
          spellCheck={false}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute inset-0 rounded-xl animate-shimmer pointer-events-none" />
        )}
      </div>
      
      <p className="text-xs text-gray-600 mt-2 ml-1">
        Auto-checks after you stop typing
      </p>
    </div>
  )
}
