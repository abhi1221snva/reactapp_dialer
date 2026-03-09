import { useAuthStore } from '../stores/auth.store'
import { canAccess, isAdmin, isManager, isSuperAdmin, LEVELS } from '../utils/permissions'

// Backend encodes SIP secret as base64_encode(convert_uuencode(raw_password))
// This reverses both layers to get the raw SIP password.
function decodeSipSecret(secret: string): string {
  try {
    // Layer 1: base64 decode → gives PHP uuencoded string
    const uu = atob(secret)

    // Layer 2: PHP convert_uudecode
    // PHP uuencode format per line: chr(len+32) + 4-char groups + '\n'
    // 0 value is encoded as backtick (96), others as value+32
    const decode6 = (s: string, pos: number): number => {
      if (pos >= s.length) return 0
      const c = s.charCodeAt(pos)
      return c === 96 ? 0 : (c - 32) & 63
    }

    let result = ''
    let i = 0
    while (i < uu.length) {
      const lenCode = uu.charCodeAt(i)
      if (lenCode === 32 || lenCode === 0) break  // space = end marker
      const lineLen = (lenCode - 32) & 63
      if (lineLen === 0) break
      i++

      let decoded = 0
      while (decoded < lineLen) {
        const c1 = decode6(uu, i);     const c2 = decode6(uu, i + 1)
        const c3 = decode6(uu, i + 2); const c4 = decode6(uu, i + 3)
        i += 4

        if (decoded < lineLen) { result += String.fromCharCode((c1 << 2) | (c2 >> 4)); decoded++ }
        if (decoded < lineLen) { result += String.fromCharCode(((c2 & 15) << 4) | (c3 >> 2)); decoded++ }
        if (decoded < lineLen) { result += String.fromCharCode(((c3 & 3) << 6) | c4); decoded++ }
      }

      if (i < uu.length && uu.charCodeAt(i) === 10) i++ // skip '\n'
    }

    return result || secret
  } catch {
    return secret
  }
}

export function useAuth() {
  const { user, token, isAuthenticated, clearAuth } = useAuthStore()

  // Prefer domain name over raw IP for WSS — cert is issued for hostname, not IP
  const isIp = (h: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(h)
  const wsHost = user
    ? (!isIp(user.domain) ? user.domain : !isIp(user.server) ? user.server : user.server)
    : ''

  const sipConfig = user
    ? {
        extension: user.alt_extension || user.extension,
        server: user.server,
        domain: user.domain,
        password: user.secret ? decodeSipSecret(user.secret) : '',
        wsUri: `wss://${wsHost}:8089/ws`,
        certUrl: `https://${user.server}:8089`,
      }
    : null

  return {
    user,
    token,
    isAuthenticated,
    level: user?.level ?? 0,
    canAccess: (minLevel: number) => canAccess(user, minLevel),
    isAdmin: isAdmin(user),
    isManager: isManager(user),
    isSuperAdmin: isSuperAdmin(user),
    isAgent: user ? user.level < LEVELS.MANAGER : false,
    sipConfig,
    logout: clearAuth,
  }
}
