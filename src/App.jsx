import { useState, useCallback, useRef, useEffect } from 'react'
import Header from './components/Header'
import KeyChecker from './components/KeyChecker'
import SessionInput from './components/SessionInput'
import AccountInfo from './components/AccountInfo'
import RechargeButton from './components/RechargeButton'
import StatusToast from './components/StatusToast'
import BackgroundEffects from './components/BackgroundEffects'
import { apiUrl } from './utils/api'

function App() {
  const [keyData, setKeyData] = useState(null)
  const [keyCode, setKeyCode] = useState('')
  const [sessionJson, setSessionJson] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [toast, setToast] = useState(null)
  const [isActivating, setIsActivating] = useState(false)
  const [activationStatus, setActivationStatus] = useState(null)

  const toastTimer = useRef(null)
  const pollController = useRef(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollController.current) pollController.current.abort()
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  const handleKeyChecked = useCallback((data) => {
    setKeyData(data)
    if (data?.activated_email) {
      setAccountEmail(data.activated_email)
    }
  }, [])

  const handleKeyCodeChange = useCallback((code) => {
    setKeyCode(code)
  }, [])

  const extractEmailFromSession = useCallback((json) => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json
      return parsed?.user?.email || parsed?.email || ''
    } catch {
      return ''
    }
  }, [])

  const handleSessionChange = useCallback((json) => {
    setSessionJson(json)
    const email = extractEmailFromSession(json)
    if (email) {
      setAccountEmail(email)
    }
  }, [extractEmailFromSession])

  const pollActivation = useCallback(async (code) => {
    if (pollController.current) pollController.current.abort()
    const controller = new AbortController()
    pollController.current = controller

    let attempts = 0
    const maxAttempts = 20

    const poll = async () => {
      if (controller.signal.aborted) return
      if (attempts >= maxAttempts) {
        setIsActivating(false)
        setActivationStatus('timeout')
        showToast('Activation timed out. Please try again.', 'error')
        return
      }

      try {
        const res = await fetch(apiUrl(`/api/keys/${code}/activation`), {
          signal: controller.signal,
        })
        const data = await res.json()

        if (data.status === 'activated') {
          setIsActivating(false)
          setActivationStatus('activated')
          setKeyData(prev => ({ ...prev, status: 'activated' }))
          setSessionJson('') // Clear sensitive session data after activation
          showToast('Key activated successfully!', 'success')
          return
        }

        attempts++
        setTimeout(poll, 2000)
      } catch (err) {
        if (err.name === 'AbortError') return
        attempts++
        setTimeout(poll, 2000)
      }
    }

    poll()
  }, [showToast])

  const handleRecharge = useCallback(async () => {
    if (!keyCode) {
      showToast('Please enter a CDK key first', 'error')
      return
    }
    if (!sessionJson) {
      showToast('Please enter session JSON data', 'error')
      return
    }
    if (keyData?.status !== 'available') {
      showToast('Key is not available for activation', 'error')
      return
    }

    setIsActivating(true)
    setActivationStatus('activating')

    try {
      const res = await fetch(apiUrl('/api/activate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: keyCode,
          session: sessionJson
        })
      })

      const data = await res.json()

      if (data.error) {
        setIsActivating(false)
        setActivationStatus('error')
        showToast(data.error, 'error')
        return
      }

      showToast('Activation started! Monitoring progress...', 'info')
      pollActivation(keyCode)
    } catch {
      setIsActivating(false)
      setActivationStatus('error')
      showToast('Failed to activate. Please try again.', 'error')
    }
  }, [keyCode, sessionJson, keyData, showToast, pollActivation])

  return (
    <div className="relative min-h-screen">
      <BackgroundEffects />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <Header />

        <div className="space-y-5 mt-8">
          <KeyChecker
            onKeyChecked={handleKeyChecked}
            onKeyCodeChange={handleKeyCodeChange}
            showToast={showToast}
          />

          <SessionInput
            onSessionChange={handleSessionChange}
            showToast={showToast}
          />

          {(accountEmail || keyData) && (
            <AccountInfo
              email={accountEmail}
              keyData={keyData}
              activationStatus={activationStatus}
            />
          )}

          <RechargeButton
            onClick={handleRecharge}
            isActivating={isActivating}
            keyData={keyData}
            hasSession={!!sessionJson}
            hasKey={!!keyCode}
          />
        </div>

      </div>

      {toast && <StatusToast message={toast.message} type={toast.type} />}
    </div>
  )
}

export default App
