// ─── Secure Admin Authentication ───────────────────────────────────────────────
// Username + Password + TOTP 2FA (30-second rotating code)

const AUTH_STORAGE = 'z3ra_admin_auth'
const SESSION_STORAGE = 'admin_session'

// ─── Default credentials (hashed) ──────────────────────────────────────────────
// Default: username=admin, password=z3ra@2024
// Users should change these after first login

// ─── SHA-256 Hashing ───────────────────────────────────────────────────────────
async function sha256(message) {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── TOTP Implementation (RFC 6238) ────────────────────────────────────────────
// Time-based One-Time Password using HMAC-SHA1

// Base32 decode (for TOTP secrets compatible with Google Authenticator)
function base32Decode(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
    const val = alphabet.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2)
  }
  return bytes
}

// Base32 encode
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0')
  }
  let result = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0')
    result += alphabet[parseInt(chunk, 2)]
  }
  return result
}

// Generate a random TOTP secret (20 bytes = 160 bits)
export function generateTOTPSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return base32Encode(bytes)
}

// Compute HMAC-SHA1
async function hmacSHA1(keyBytes, message) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, message)
  return new Uint8Array(sig)
}

// Generate TOTP code for a given time
export async function generateTOTP(secret, timeStep = 30) {
  const keyBytes = base32Decode(secret)
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)

  // Convert counter to 8-byte big-endian
  const counterBytes = new Uint8Array(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const hmac = await hmacSHA1(keyBytes, counterBytes)

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000

  return code.toString().padStart(6, '0')
}

// Get time remaining in current period
export function getTOTPTimeRemaining(timeStep = 30) {
  return timeStep - (Math.floor(Date.now() / 1000) % timeStep)
}

// Generate Google Authenticator URI
export function getTOTPUri(secret, username = 'admin', issuer = 'Z3RA Recharge') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// ─── Auth Storage ──────────────────────────────────────────────────────────────

export function getAuthConfig() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupt storage */ }
  return null
}

export async function initializeAuth() {
  const existing = getAuthConfig()
  if (existing) return existing

  // First-time setup: create default credentials
  const secret = generateTOTPSecret()
  const usernameHash = await sha256('admin')
  const passwordHash = await sha256('z3ra@2024')

  const config = {
    usernameHash,
    passwordHash,
    totpSecret: secret,
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  }

  localStorage.setItem(AUTH_STORAGE, JSON.stringify(config))
  return config
}

// ─── Login Verification ────────────────────────────────────────────────────────

export async function verifyLogin(username, password, totpCode) {
  const config = getAuthConfig()
  if (!config) throw new Error('Auth not initialized')

  // Check lockout
  if (config.lockedUntil && Date.now() < config.lockedUntil) {
    const remaining = Math.ceil((config.lockedUntil - Date.now()) / 1000)
    throw new Error(`Account locked. Try again in ${remaining}s`)
  }

  const usernameHash = await sha256(username)
  const passwordHash = await sha256(password)

  // Verify username & password
  if (usernameHash !== config.usernameHash || passwordHash !== config.passwordHash) {
    // Increment failed attempts
    config.failedAttempts = (config.failedAttempts || 0) + 1
    if (config.failedAttempts >= 5) {
      config.lockedUntil = Date.now() + 5 * 60 * 1000 // Lock for 5 min
      config.failedAttempts = 0
    }
    localStorage.setItem(AUTH_STORAGE, JSON.stringify(config))
    throw new Error('Invalid username or password')
  }

  // Verify TOTP (allow ±1 time step for clock drift)
  const secret = config.totpSecret
  const currentCode = await generateTOTP(secret, 30)

  // Also check previous and next period for clock skew tolerance
  const epoch = Math.floor(Date.now() / 1000)
  const prevCounter = Math.floor(epoch / 30) - 1
  const nextCounter = Math.floor(epoch / 30) + 1

  const codes = [currentCode]

  // Generate codes for adjacent time steps
  for (const counterVal of [prevCounter, nextCounter]) {
    const counterBytes = new Uint8Array(8)
    let tmp = counterVal
    for (let i = 7; i >= 0; i--) {
      counterBytes[i] = tmp & 0xff
      tmp = Math.floor(tmp / 256)
    }
    const keyBytes = base32Decode(secret)
    const hmac = await hmacSHA1(keyBytes, counterBytes)
    const offset = hmac[hmac.length - 1] & 0x0f
    const code = (
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)
    ) % 1000000
    codes.push(code.toString().padStart(6, '0'))
  }

  if (!codes.includes(totpCode)) {
    config.failedAttempts = (config.failedAttempts || 0) + 1
    if (config.failedAttempts >= 5) {
      config.lockedUntil = Date.now() + 5 * 60 * 1000
      config.failedAttempts = 0
    }
    localStorage.setItem(AUTH_STORAGE, JSON.stringify(config))
    throw new Error('Invalid 2FA code')
  }

  // Success — reset failed attempts
  config.failedAttempts = 0
  config.lockedUntil = null
  localStorage.setItem(AUTH_STORAGE, JSON.stringify(config))

  // Create session
  const session = {
    token: await sha256(`session_${Date.now()}_${Math.random()}`),
    expires: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
    username,
  }
  localStorage.setItem(SESSION_STORAGE, JSON.stringify(session))
  return session
}

// ─── Session Check ─────────────────────────────────────────────────────────────

export function isAuthenticated() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE)
    if (!raw) return false
    const { expires } = JSON.parse(raw)
    if (Date.now() > expires) {
      localStorage.removeItem(SESSION_STORAGE)
      return false
    }
    return true
  } catch {
    return false
  }
}

export function logout() {
  localStorage.removeItem(SESSION_STORAGE)
}

// ─── Change Credentials ────────────────────────────────────────────────────────

export async function changeCredentials(currentPassword, newUsername, newPassword) {
  const config = getAuthConfig()
  if (!config) throw new Error('Auth not initialized')

  const currentHash = await sha256(currentPassword)
  if (currentHash !== config.passwordHash) {
    throw new Error('Current password is incorrect')
  }

  if (newUsername) config.usernameHash = await sha256(newUsername)
  if (newPassword) config.passwordHash = await sha256(newPassword)
  config.failedAttempts = 0
  config.lockedUntil = null

  localStorage.setItem(AUTH_STORAGE, JSON.stringify(config))
  return true
}

// Reset auth to factory defaults (for emergency)
export async function resetAuth() {
  localStorage.removeItem(AUTH_STORAGE)
  localStorage.removeItem(SESSION_STORAGE)
  return await initializeAuth()
}
