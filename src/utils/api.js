// Unified API base URL
// Dev: empty string → relative paths go through vite proxy
// Prod: absolute URL to the API server
export const API_BASE = import.meta.env.DEV ? '' : 'https://toolsmarket.online'

export function apiUrl(path) {
  return `${API_BASE}${path}`
}
