import { useState, useCallback } from 'react'

export default function SessionInput({ onSessionChange, showToast }) {
  const [rawJson, setRawJson] = useState('')
  const [isValid, setIsValid] = useState(null)
  const [isFormatted, setIsFormatted] = useState(false)

  const validateAndSet = useCallback((value) => {
    setRawJson(value)
    if (!value.trim()) {
      setIsValid(null)
      onSessionChange('')
      return
    }
    try {
      JSON.parse(value)
      setIsValid(true)
      onSessionChange(value)
    } catch {
      setIsValid(false)
      onSessionChange('')
    }
  }, [onSessionChange])

  const handleFormat = useCallback(() => {
    if (!rawJson.trim()) return
    try {
      const parsed = JSON.parse(rawJson)
      const formatted = JSON.stringify(parsed, null, 2)
      setRawJson(formatted)
      setIsFormatted(true)
      setIsValid(true)
      showToast('JSON formatted successfully', 'success')
    } catch {
      showToast('Invalid JSON - cannot format', 'error')
    }
  }, [rawJson, showToast])

  const handleGetData = useCallback(() => {
    window.open('https://chatgpt.com/api/auth/session', '_blank')
    showToast('Copy the session data from the opened page', 'info')
  }, [showToast])

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.json')) {
      showToast('Please select a JSON file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      try {
        JSON.parse(content)
        setRawJson(content)
        setIsValid(true)
        onSessionChange(content)
        showToast('JSON file loaded successfully', 'success')
      } catch {
        showToast('Invalid JSON file', 'error')
      }
    }
    reader.readAsText(file)
  }, [onSessionChange, showToast])

  return (
    <div className="glass rounded-2xl p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Account Data (Session JSON)</h2>
        </div>
        
        <div className="flex gap-1.5">
          <button
            onClick={handleFormat}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-400 
                       hover:bg-purple-500/20 transition-all duration-200 border border-purple-500/10
                       hover:border-purple-500/30 cursor-pointer"
          >
            ✨ Format
          </button>
          <button
            onClick={handleGetData}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 
                       hover:bg-emerald-500/20 transition-all duration-200 border border-emerald-500/10
                       hover:border-emerald-500/30 cursor-pointer"
          >
            🔗 Get Data
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={rawJson}
          onChange={(e) => validateAndSet(e.target.value)}
          placeholder='{"accessToken":"...","user":{"id":"user-...","email":"..."}}'
          rows={5}
          className={`w-full bg-dark-800/80 border rounded-xl px-4 py-3 text-sm text-gray-200 
                      placeholder-gray-600 outline-none transition-all duration-300
                      font-mono text-xs leading-relaxed resize-y min-h-[120px]
                      focus:ring-2 focus:ring-purple-500/10 focus:bg-dark-800
                      ${isValid === true ? 'border-emerald-500/30 focus:border-emerald-500/50' : 
                        isValid === false ? 'border-rose-500/30 focus:border-rose-500/50' : 
                        'border-dark-500/50 focus:border-purple-500/50'}`}
          spellCheck={false}
        />
        
        {isValid !== null && (
          <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isValid ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-600 ml-1">
          {isValid === true ? '✓ Valid JSON' : isValid === false ? '✗ Invalid JSON' : 'Paste session data or upload file'}
        </p>
        
        <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg 
                          bg-dark-600/50 text-gray-400 hover:text-gray-300 hover:bg-dark-500/50 
                          transition-all duration-200 cursor-pointer border border-dark-500/30">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload JSON
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>
    </div>
  )
}
