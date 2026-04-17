// ─── CDK Key Pool ──────────────────────────────────────────────────────────────
// These are the real API keys from toolsmarket.online
export const CDK_KEY_POOL = [
  'EF89460DE6D64E89BF090556643B376A',
  '97615B49203544059FCA6C6F2CBBC560',
  'B6589D287AF240E2A34F6B5C1BE226C4',
  'F08AC24BC23D4FB8BB991C74123FEF57',
  'BD585773276C467F8D17E818707EA15A',
  '1D483025AA0C42F784C492587ADBE42F',
  '1A145E88DEBB491A8873869930A3389A',
]

// ─── Key Link Storage ──────────────────────────────────────────────────────────
// Maps custom Z3RA-xxxx keys → real CDK key codes from toolsmarket.online API
const LINKS_STORAGE = 'z3ra_key_links'

export function getKeyLinks() {
  try {
    return JSON.parse(localStorage.getItem(LINKS_STORAGE) || '[]')
  } catch {
    return []
  }
}

export function saveKeyLinks(links) {
  localStorage.setItem(LINKS_STORAGE, JSON.stringify(links))
}

export function addKeyLink(link) {
  const links = getKeyLinks()
  links.push({
    ...link,
    createdAt: new Date().toISOString(),
    used: false,
  })
  saveKeyLinks(links)
  return getKeyLinks()
}

export function deleteKeyLink(z3raKey) {
  const links = getKeyLinks().filter(l => l.z3raKey !== z3raKey)
  saveKeyLinks(links)
  return links
}

export function updateKeyLink(z3raKey, updates) {
  const links = getKeyLinks().map(l =>
    l.z3raKey === z3raKey ? { ...l, ...updates } : l
  )
  saveKeyLinks(links)
  return links
}

export function findLinkByZ3RA(z3raKey) {
  return getKeyLinks().find(l => l.z3raKey === z3raKey) || null
}

export function findLinkByCDK(cdkKey) {
  return getKeyLinks().find(l => l.cdkKey === cdkKey) || null
}

// Get CDK keys that are already linked
export function getLinkedCDKKeys() {
  return getKeyLinks().map(l => l.cdkKey)
}

// Get CDK keys that are NOT yet linked
export function getAvailableCDKKeys() {
  const linked = getLinkedCDKKeys()
  return CDK_KEY_POOL.filter(k => !linked.includes(k))
}

// Generate a Z3RA-XXXX-XXXX-XXXX key
export function generateZ3RAKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `Z3RA-${segment()}-${segment()}-${segment()}`
}

// ─── Admin Key Storage ─────────────────────────────────────────────────────────
const ADMIN_KEYS_STORAGE = 'admin_keys'
export const DEFAULT_ADMIN_KEY = 'EF89460DE6D64E89BF090556643B376A'

export function getAdminKeys() {
  try {
    const raw = localStorage.getItem(ADMIN_KEYS_STORAGE)
    if (!raw) {
      const defaults = [{ key: DEFAULT_ADMIN_KEY, label: 'Default Admin Key', createdAt: new Date().toISOString() }]
      localStorage.setItem(ADMIN_KEYS_STORAGE, JSON.stringify(defaults))
      return defaults
    }
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveAdminKeys(keys) {
  localStorage.setItem(ADMIN_KEYS_STORAGE, JSON.stringify(keys))
}

export function generateAdminKey() {
  const chars = 'ABCDEF0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
