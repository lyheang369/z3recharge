// Unified API base URL
// Dev: vite proxy handles /api → toolsmarket.online
// Prod: /recharge/api → our PHP proxy (avoids CORS)
export const API_BASE = import.meta.env.DEV ? '' : '/recharge'

export function apiUrl(path) {
  return `${API_BASE}${path}`
}
