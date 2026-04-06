import { useAuthStore } from '../stores/auth.store'
import { canAccess, isAdmin, isManager, isSuperAdmin, LEVELS } from '../utils/permissions'

// Backend may send the SIP secret in two formats:
// 1. Encoded: base64_encode(convert_uuencode(raw_password))
// 2. Plain text: the raw password as-is
// This function tries to decode format 1 and validates the result.
// If decoding produces non-printable characters it's a plain-text password
// that happened to look like valid base64, so we return the raw value.
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

    if (!result) return secret

    // Validate: a real decoded password contains only printable ASCII (32-126).
    // If we see control chars or high bytes, atob decoded a plain-text password
    // that happened to be valid base64 → return the original secret.
    const isPrintable = /^[\x20-\x7e]+$/.test(result)
    return isPrintable ? result : secret
  } catch {
    return secret
  }
}

export function useAuth() {
  const { user, token, isAuthenticated, clearAuth } = useAuthStore()

  // Prefer domain name over raw IP for WSS — cert is issued for hostname, not IP
  const isIp = (h: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(h)

  const resolveWsHost = (): string => {
    if (!user) return ''
    // Use domain if it's a hostname (not IP)
    if (user.domain && !isIp(user.domain)) return user.domain
    // Fall back to server if it's a hostname
    if (user.server && !isIp(user.server)) return user.server
    // Fall back to server IP (cert may not match but it's the only option)
    return user.server || ''
  }

  const wsHost = resolveWsHost()

  // sipConfig is always non-null when user exists:
  // - isConfigured=true  → full SIP credentials present, webphone can connect
  // - isConfigured=false → server/extension missing, show "SIP Not Configured" card
  const sipConfig = user
    ? {
        extension: user.alt_extension || user.extension,
        server: user.server,
        domain: user.domain,
        password: user.secret ? decodeSipSecret(user.secret) : '',
        wsUri: wsHost ? `wss://${wsHost}:8089/ws` : '',
        certUrl: wsHost ? `https://${wsHost}:8089` : '',
        isConfigured: !!wsHost && !!(user.alt_extension || user.extension),
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
