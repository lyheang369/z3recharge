import { useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import BackgroundEffects from '../components/BackgroundEffects'
import StatusToast from '../components/StatusToast'
import { logout } from '../utils/auth'
import { apiUrl } from '../utils/api'
import {
  getAdminKeys, saveAdminKeys, generateAdminKey, DEFAULT_ADMIN_KEY,
  getKeyLinks, addKeyLink, deleteKeyLink,
  generateZ3RAKey, getAvailableCDKKeys, CDK_KEY_POOL,
} from '../utils/keyStore'

const TABS = ['🔗 Key Linker', '🔑 Admin Keys', '🔍 API Tester', '📊 Batch Lookup']

export default function AdminPage() {
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState(0)
  const [copied, setCopied] = useState(null)

  // Admin keys
  const [adminKeys, setAdminKeys] = useState(getAdminKeys)
  const [newLabel, setNewLabel] = useState('')
  const [customKey, setCustomKey] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  // Key linker
  const [keyLinks, setKeyLinks] = useState(getKeyLinks)
  const [linkLabel, setLinkLabel] = useState('')
  const [selectedCDK, setSelectedCDK] = useState('')
  const [generatedZ3RA, setGeneratedZ3RA] = useState('')
  const [useCustomZ3RA, setUseCustomZ3RA] = useState(false)
  const [customZ3RA, setCustomZ3RA] = useState('')
  const [verifyingCDK, setVerifyingCDK] = useState(null)

  // API Tester
  const [lookupCode, setLookupCode] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  // Batch
  const [batchInput, setBatchInput] = useState('')
  const [batchResult, setBatchResult] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)

  const toastTimer = useRef(null)
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/admin/login', { replace: true })
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
    showToast('Copied!', 'success')
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when keyLinks changes (reads localStorage)
  const availableCDK = useMemo(() => getAvailableCDKKeys(), [keyLinks])

  // ── Key Linker ─────────────────────────────────────────────────────────────
  const handleGenerateZ3RA = () => {
    const key = generateZ3RAKey()
    setGeneratedZ3RA(key)
    setUseCustomZ3RA(false)
  }

  const handleVerifyCDK = async (cdkKey) => {
    setVerifyingCDK(cdkKey)
    try {
      const res = await fetch(apiUrl(`/api/keys/${encodeURIComponent(cdkKey)}`))
      const data = await res.json()
      showToast(
        data.error ? `❌ ${data.error}` :
        `✅ ${data.status} · ${data.plan || '?'} · ${data.term || '?'}`,
        data.error ? 'error' : 'success'
      )
    } catch {
      showToast('Network error', 'error')
    }
    setVerifyingCDK(null)
  }

  const handleCreateLink = () => {
    const z3raKey = useCustomZ3RA ? customZ3RA.trim() : generatedZ3RA
    if (!z3raKey) { showToast('Generate or enter a Z3RA key first', 'error'); return }
    if (!z3raKey.startsWith('Z3RA-')) { showToast('Key must start with Z3RA-', 'error'); return }
    if (!selectedCDK) { showToast('Select a CDK key to link', 'error'); return }
    if (!linkLabel.trim()) { showToast('Enter a label', 'error'); return }
    if (keyLinks.find(l => l.z3raKey === z3raKey)) { showToast('Z3RA key already exists', 'error'); return }

    const updated = addKeyLink({
      z3raKey,
      cdkKey: selectedCDK,
      label: linkLabel.trim(),
    })
    setKeyLinks(updated)
    setLinkLabel('')
    setGeneratedZ3RA('')
    setCustomZ3RA('')
    setSelectedCDK('')
    showToast(`🔗 Linked ${z3raKey} → CDK key`, 'success')
  }

  const handleDeleteLink = (z3raKey) => {
    const updated = deleteKeyLink(z3raKey)
    setKeyLinks(updated)
    showToast('Link deleted', 'info')
  }

  // ── Admin Keys ─────────────────────────────────────────────────────────────
  const handleAddKey = () => {
    if (!newLabel.trim()) { showToast('Enter a label', 'error'); return }
    const key = useCustom ? customKey.trim() : generateAdminKey()
    if (!key) { showToast('Enter a custom key', 'error'); return }
    if (adminKeys.find(k => k.key === key)) { showToast('Key exists', 'error'); return }
    const updated = [...adminKeys, { key, label: newLabel.trim(), createdAt: new Date().toISOString() }]
    saveAdminKeys(updated)
    setAdminKeys(updated)
    setNewLabel('')
    setCustomKey('')
    setUseCustom(false)
    showToast('Admin key created!', 'success')
  }

  const handleDeleteAdminKey = (keyToDelete) => {
    if (keyToDelete === DEFAULT_ADMIN_KEY && adminKeys.length === 1) {
      showToast('Cannot delete the last key', 'error'); return
    }
    const updated = adminKeys.filter(k => k.key !== keyToDelete)
    saveAdminKeys(updated)
    setAdminKeys(updated)
    showToast('Key deleted', 'info')
  }

  // ── API Tester ─────────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!lookupCode.trim()) return
    setLookupLoading(true)
    setLookupResult(null)
    try {
      const res = await fetch(apiUrl(`/api/keys/${encodeURIComponent(lookupCode.trim())}`))
      const data = await res.json()
      setLookupResult({ ok: !data.error, data })
    } catch { setLookupResult({ ok: false, data: { error: 'Network error' } }) }
    setLookupLoading(false)
  }

  // ── Batch ──────────────────────────────────────────────────────────────────
  const handleBatch = async () => {
    const codes = batchInput.split('\n').map(s => s.trim()).filter(Boolean)
    if (!codes.length) { showToast('Enter at least one key', 'error'); return }
    setBatchLoading(true)
    setBatchResult(null)
    try {
      const res = await fetch(apiUrl('/api/batch-lookup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes }),
      })
      setBatchResult(await res.json())
    } catch { setBatchResult({ error: 'Network error' }) }
    setBatchLoading(false)
  }

  const sessionInfo = (() => {
    try { return JSON.parse(localStorage.getItem('admin_session') || '{}') } catch { return {} }
  })()

  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />
      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-16">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">Key Management & API Control</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-gray-500 hover:text-purple-400 transition-colors">← User Portal</Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/10 hover:bg-rose-500/20 transition-all duration-200 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard icon="🔗" label="Linked Keys" value={keyLinks.length} color="purple" />
          <StatCard icon="📦" label="CDK Pool" value={`${availableCDK.length}/${CDK_KEY_POOL.length}`} color="sky" />
          <StatCard icon="🔑" label="Admin Keys" value={adminKeys.length} color="emerald" />
          <StatCard icon="🔒" label="Session" value={sessionInfo.keyLabel || 'Active'} color="amber" small />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 p-1 glass rounded-xl mb-5">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer
                ${activeTab === i ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25' : 'text-gray-400 hover:text-gray-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ═══════════════ TAB 0: KEY LINKER ═══════════════ */}
        {activeTab === 0 && (
          <div className="space-y-4 animate-slide-up">

            {/* Create link */}
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center text-xs">🔗</span>
                Create Key Link
              </h2>
              <p className="text-xs text-gray-500 mb-4">Generate a <span className="text-purple-400 font-mono">Z3RA-</span> key and link it to a real CDK key from your pool.</p>

              <div className="space-y-3">
                {/* Label */}
                <input type="text" value={linkLabel} onChange={e => setLinkLabel(e.target.value)}
                  placeholder="Label (e.g. Customer A, Reseller #5...)"
                  className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all" />

                {/* Z3RA key generation */}
                <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Z3RA Key</p>
                    <div className="flex gap-1.5">
                      <button onClick={handleGenerateZ3RA}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all duration-200 cursor-pointer border border-purple-500/10">
                        🎲 Generate
                      </button>
                      <button onClick={() => { setUseCustomZ3RA(v => !v); setGeneratedZ3RA('') }}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer border
                          ${useCustomZ3RA ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-dark-600/50 text-gray-500 border-dark-500/30'}`}>
                        ✏️ Custom
                      </button>
                    </div>
                  </div>

                  {useCustomZ3RA ? (
                    <input type="text" value={customZ3RA}
                      onChange={e => setCustomZ3RA(e.target.value.toUpperCase())}
                      placeholder="Z3RA-XXXX-XXXX-XXXX"
                      className="w-full bg-dark-900/60 border border-amber-500/20 rounded-lg px-4 py-2.5 text-sm text-amber-300 placeholder-gray-600 outline-none focus:border-amber-500/40 transition-all font-mono tracking-widest" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 bg-dark-900/60 rounded-lg px-4 py-2.5 font-mono text-sm tracking-widest
                        ${generatedZ3RA ? 'text-purple-300' : 'text-gray-600'}`}>
                        {generatedZ3RA || 'Click "Generate" to create a key'}
                      </div>
                      {generatedZ3RA && (
                        <button onClick={() => copyToClipboard(generatedZ3RA, 'z3ra-gen')}
                          className="p-2 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all cursor-pointer">
                          {copied === 'z3ra-gen' ? '✓' : '📋'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* CDK key selector */}
                <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-500/30">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Link to CDK Key ({availableCDK.length} available)
                  </p>

                  {availableCDK.length === 0 ? (
                    <p className="text-xs text-rose-400">All CDK keys are already linked!</p>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {CDK_KEY_POOL.map(cdk => {
                        const isLinked = !availableCDK.includes(cdk)
                        const isSelected = selectedCDK === cdk
                        return (
                          <button key={cdk} onClick={() => !isLinked && setSelectedCDK(cdk)}
                            disabled={isLinked}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 cursor-pointer border
                              ${isLinked
                                ? 'opacity-30 cursor-not-allowed border-dark-500/20 bg-dark-800/30'
                                : isSelected
                                  ? 'border-purple-500/40 bg-purple-500/10 shadow-sm shadow-purple-500/10'
                                  : 'border-dark-500/20 bg-dark-800/30 hover:border-purple-500/20 hover:bg-dark-700/50'
                              }`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                              ${isSelected ? 'border-purple-400 bg-purple-500' : isLinked ? 'border-gray-700' : 'border-gray-600'}`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-xs font-mono text-gray-400 truncate flex-1">{cdk}</span>
                            {isLinked && <span className="text-[10px] text-gray-600">linked</span>}
                            {!isLinked && (
                              <button onClick={(e) => { e.stopPropagation(); handleVerifyCDK(cdk) }}
                                className="text-[10px] text-sky-500 hover:text-sky-400 shrink-0 cursor-pointer">
                                {verifyingCDK === cdk ? '...' : 'verify'}
                              </button>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Create button */}
                <button onClick={handleCreateLink}
                  disabled={!(useCustomZ3RA ? customZ3RA : generatedZ3RA) || !selectedCDK || !linkLabel.trim()}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100">
                  🔗 Create Link
                </button>
              </div>
            </div>

            {/* Active links list */}
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center text-xs text-emerald-400">✓</span>
                Active Key Links ({keyLinks.length})
              </h2>

              {keyLinks.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-6">No key links yet. Create one above!</p>
              ) : (
                <div className="space-y-2">
                  {keyLinks.map(link => (
                    <div key={link.z3raKey} className="bg-dark-800/50 rounded-xl px-4 py-3 border border-dark-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200">{link.label}</span>
                          {link.used && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-amber-500/15 text-amber-400 font-medium">USED</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => copyToClipboard(link.z3raKey, `z-${link.z3raKey}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all cursor-pointer" title="Copy Z3RA key">
                            {copied === `z-${link.z3raKey}` ? (
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            )}
                          </button>
                          <button onClick={() => handleDeleteLink(link.z3raKey)}
                            className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer" title="Delete link">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Z3RA Key (User)</p>
                          <p className="text-xs font-mono text-purple-400 mt-0.5 truncate">{link.z3raKey}</p>
                        </div>
                        <div className="bg-dark-900/40 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider">CDK Key (API)</p>
                          <p className="text-xs font-mono text-sky-400 mt-0.5 truncate">{link.cdkKey}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1.5">Created {new Date(link.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════ TAB 1: ADMIN KEYS ═══════════════ */}
        {activeTab === 1 && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-purple-500/15 flex items-center justify-center text-xs">+</span>
                Create New Admin Key
              </h2>
              <div className="space-y-3">
                <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="Key label (e.g. Sales Team, Bot Key...)"
                  className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all" />
                <div className="flex items-center gap-2">
                  <button onClick={() => setUseCustom(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border
                      ${useCustom ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-dark-600/50 text-gray-500 border-dark-500/30 hover:text-gray-300'}`}>
                    {useCustom ? '✏️ Custom key' : '🎲 Auto-generate'}
                  </button>
                  {!useCustom && <p className="text-xs text-gray-600">A secure 32-char key will be generated</p>}
                </div>
                {useCustom && (
                  <input type="text" value={customKey} onChange={e => setCustomKey(e.target.value.toUpperCase())}
                    placeholder="Enter custom key (alphanumeric)..." maxLength={64}
                    className="w-full bg-dark-800/80 border border-amber-500/20 rounded-xl px-4 py-2.5 text-sm text-amber-300 placeholder-gray-600 outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10 transition-all font-mono tracking-widest" />
                )}
                <button onClick={handleAddKey}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 cursor-pointer">
                  ＋ Add Key
                </button>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Active Admin Keys ({adminKeys.length})</h2>
              <div className="space-y-2">
                {adminKeys.map(k => (
                  <div key={k.key} className="flex items-center gap-3 bg-dark-800/50 rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-gray-200">{k.label}</p>
                        {k.key === DEFAULT_ADMIN_KEY && <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-purple-500/15 text-purple-400 font-medium">DEFAULT</span>}
                      </div>
                      <p className="text-xs font-mono text-gray-500 truncate">{k.key}</p>
                    </div>
                    <button onClick={() => copyToClipboard(k.key, k.key)} className="p-1.5 rounded-lg text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 transition-all cursor-pointer">
                      {copied === k.key ? <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                    </button>
                    <button onClick={() => handleDeleteAdminKey(k.key)} className="p-1.5 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB 2: API TESTER ═══════════════ */}
        {activeTab === 2 && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">🔍 Lookup CDK Key</h2>
              <div className="flex gap-2">
                <input type="text" value={lookupCode} onChange={e => setLookupCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()} placeholder="Enter CDK key code..."
                  className="flex-1 bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all font-mono" />
                <button onClick={handleLookup} disabled={lookupLoading || !lookupCode.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                  {lookupLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-slow" /> : '→'}
                </button>
              </div>
              {lookupResult && (
                <div className={`mt-4 rounded-xl p-4 border font-mono text-xs leading-relaxed ${lookupResult.ok ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-300' : 'bg-rose-500/5 border-rose-500/15 text-rose-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${lookupResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {lookupResult.ok ? '200 OK' : 'Error'}
                    </span>
                    <button onClick={() => copyToClipboard(JSON.stringify(lookupResult.data, null, 2), 'lookup')}
                      className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-[10px]">
                      {copied === 'lookup' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-gray-300">{JSON.stringify(lookupResult.data, null, 2)}</pre>
                </div>
              )}
            </div>
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">📚 API Reference</h2>
              <div className="space-y-3">
                {[
                  { method: 'GET', path: '/api/keys/:code', desc: 'Get CDK key metadata' },
                  { method: 'POST', path: '/api/activate', desc: 'Activate key with session JSON' },
                  { method: 'GET', path: '/api/keys/:code/activation', desc: 'Poll activation status (every 3s)' },
                  { method: 'POST', path: '/api/batch-lookup', desc: 'Bulk check up to 1000 keys' },
                ].map(ep => (
                  <div key={ep.path} className="flex items-start gap-3 bg-dark-800/40 rounded-xl px-4 py-3">
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md ${ep.method === 'GET' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'}`}>{ep.method}</span>
                    <div><p className="text-xs font-mono text-gray-300">{ep.path}</p><p className="text-xs text-gray-500 mt-0.5">{ep.desc}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ TAB 3: BATCH ═══════════════ */}
        {activeTab === 3 && (
          <div className="space-y-4 animate-slide-up">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">📊 Batch Key Lookup</h2>
              <p className="text-xs text-gray-500 mb-3">One key code per line (up to 1000)</p>
              <textarea value={batchInput} onChange={e => setBatchInput(e.target.value)} placeholder={"KEY_CODE_1\nKEY_CODE_2\nKEY_CODE_3"} rows={6}
                className="w-full bg-dark-800/80 border border-dark-500/50 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 transition-all font-mono resize-y" />
              <button onClick={handleBatch} disabled={batchLoading || !batchInput.trim()}
                className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-semibold transition-all cursor-pointer hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
                {batchLoading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-slow" /> Looking up...</span> : '⚡ Run Batch Lookup'}
              </button>
            </div>
            {batchResult && (
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Results</h2>
                  <button onClick={() => copyToClipboard(JSON.stringify(batchResult, null, 2), 'batch')} className="text-xs text-gray-500 hover:text-purple-400 transition-colors cursor-pointer">
                    {copied === 'batch' ? '✓ Copied' : 'Copy all'}
                  </button>
                </div>
                {batchResult.error ? <p className="text-rose-400 text-sm">{batchResult.error}</p> : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(batchResult.results || []).map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border
                        ${r.error ? 'bg-rose-500/5 border-rose-500/10' : r.status === 'available' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-sky-500/5 border-sky-500/10'}`}>
                        <span className={`text-xs font-bold shrink-0 ${r.error ? 'text-rose-400' : r.status === 'available' ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {r.error ? '✗' : r.status === 'available' ? '✓' : '●'}
                        </span>
                        <span className="text-xs font-mono text-gray-300 truncate flex-1">{r.code}</span>
                        <span className="text-xs text-gray-500 shrink-0">{r.error || `${r.status} · ${r.plan || '?'} · ${r.term || '?'}`}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {toast && <StatusToast message={toast.message} type={toast.type} />}
    </div>
  )
}

function StatCard({ icon, label, value, color, small }) {
  const colorMap = {
    purple: 'bg-purple-500/5 border-purple-500/10',
    sky: 'bg-sky-500/5 border-sky-500/10',
    emerald: 'bg-emerald-500/5 border-emerald-500/10',
    amber: 'bg-amber-500/5 border-amber-500/10',
  }
  return (
    <div className={`glass rounded-xl px-4 py-3 border ${colorMap[color]}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{icon} {label}</p>
      <p className={`font-bold mt-1 truncate ${small ? 'text-sm text-gray-300' : 'text-xl text-white'}`}>{value}</p>
    </div>
  )
}
