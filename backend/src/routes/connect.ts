import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { verifyCredentials } from '../services/kalshi'
import { createProfile, getProfileByApiKey } from '../db'

export const connectRoute = new Hono()

// In-memory store for credentials (temporary, per-session)
// In production, you'd want a more secure approach
export const credentialsStore = new Map<string, { apiKeyId: string; privateKeyPem: string }>()

// Validate PEM format server-side
function isValidPem(content: string): boolean {
  const trimmed = content.trim()
  const validHeaders = [
    '-----BEGIN RSA PRIVATE KEY-----',
    '-----BEGIN PRIVATE KEY-----',
    '-----BEGIN EC PRIVATE KEY-----',
  ]
  const validFooters = [
    '-----END RSA PRIVATE KEY-----',
    '-----END PRIVATE KEY-----',
    '-----END EC PRIVATE KEY-----',
  ]

  const hasValidHeader = validHeaders.some(h => trimmed.startsWith(h))
  const hasValidFooter = validFooters.some(f => trimmed.endsWith(f))

  // Check for suspicious content (basic check)
  const suspiciousPatterns = [
    /<script/i,
    /<%/,
    /\$\{/,
    /eval\(/i,
    /exec\(/i,
    /system\(/i,
    /passthru/i,
    /shell_exec/i,
  ]
  const hasSuspiciousContent = suspiciousPatterns.some(p => p.test(trimmed))

  return hasValidHeader && hasValidFooter && !hasSuspiciousContent
}

connectRoute.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { apiKeyId, privateKeyPem } = body

    if (!apiKeyId || !privateKeyPem) {
      return c.json({ error: 'Missing apiKeyId or privateKeyPem' }, 400)
    }

    // Validate PEM format
    if (!isValidPem(privateKeyPem)) {
      return c.json({ error: 'Invalid private key format. Please provide a valid PEM file.' }, 400)
    }

    // Validate API Key ID format (should be UUID-like)
    const uuidRegex = /^[a-f0-9-]{36}$/i
    if (!uuidRegex.test(apiKeyId.trim())) {
      return c.json({ error: 'Invalid API Key ID format.' }, 400)
    }

    // Verify credentials with Kalshi
    const isValid = await verifyCredentials({ apiKeyId: apiKeyId.trim(), privateKeyPem: privateKeyPem.trim() })

    if (!isValid) {
      return c.json({ error: 'Invalid credentials. Please check your API key and private key.' }, 401)
    }

    // Check if profile already exists for this API key
    let profile = getProfileByApiKey(apiKeyId)

    if (!profile) {
      // Create new profile
      const profileId = uuidv4()
      profile = createProfile(profileId, apiKeyId)
    }

    // Store credentials in memory (for this session)
    credentialsStore.set(profile.id, { apiKeyId, privateKeyPem })

    return c.json({
      success: true,
      profileId: profile.id,
      message: 'Connected successfully'
    })
  } catch (error) {
    console.error('Connect error:', error)
    return c.json({ error: 'Failed to connect. Please try again.' }, 500)
  }
})
