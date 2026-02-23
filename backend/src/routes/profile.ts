import { Hono } from 'hono'
import { getProfile, getProfileByUsername, updateProfileCache } from '../db'
import { analyzePersonality } from '../services/analyzer'
import { credentialsStore } from './connect'
import type { Profile } from '../db'

export const profileRoute = new Hono()

// Resolve identifier: try username first, then UUID
function resolveProfile(identifier: string): Profile | undefined {
  // Try username first (non-UUID format)
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  if (!isUUID) {
    return getProfileByUsername(identifier)
  }
  return getProfile(identifier)
}

profileRoute.get('/:id', async (c) => {
  try {
    const identifier = c.req.param('id')

    // Resolve profile by username or UUID
    const profile = resolveProfile(identifier)

    if (!profile) {
      return c.json({ error: 'Profile not found', needsConnect: true }, 404)
    }

    // Check if we have cached analysis (less than 5 minutes old)
    const cacheMaxAge = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()

    // Determine if this is the owner (has active credentials)
    const credentials = credentialsStore.get(profile.id)
    const isOwner = !!credentials

    if (profile.analysis_cache && profile.updated_at && (now - profile.updated_at) < cacheMaxAge) {
      const cachedAnalysis = JSON.parse(profile.analysis_cache)
      return c.json({
        profileId: profile.id,
        username: profile.username,
        analysis: cachedAnalysis,
        cached: true,
        isOwner,
      })
    }

    // If no credentials but has cached analysis (public view — serve stale cache)
    if (!credentials && profile.analysis_cache) {
      const cachedAnalysis = JSON.parse(profile.analysis_cache)
      return c.json({
        profileId: profile.id,
        username: profile.username,
        analysis: cachedAnalysis,
        cached: true,
        isOwner: false,
      })
    }

    // No credentials and no cache — need to connect
    if (!credentials) {
      return c.json({
        error: 'Session expired. Please reconnect your Kalshi account.',
        needsReconnect: true
      }, 401)
    }

    // Run analysis
    const analysis = await analyzePersonality(credentials)

    // Cache the result
    updateProfileCache(profile.id, JSON.stringify(analysis))

    return c.json({
      profileId: profile.id,
      username: profile.username,
      analysis,
      cached: false,
      isOwner: true,
    })
  } catch (error) {
    console.error('Profile error:', error)
    return c.json({ error: 'Failed to load profile' }, 500)
  }
})

// Force refresh analysis
profileRoute.post('/:id/refresh', async (c) => {
  try {
    const identifier = c.req.param('id')

    const profile = resolveProfile(identifier)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    const credentials = credentialsStore.get(profile.id)
    if (!credentials) {
      return c.json({
        error: 'Session expired. Please reconnect.',
        needsReconnect: true
      }, 401)
    }

    const analysis = await analyzePersonality(credentials)
    updateProfileCache(profile.id, JSON.stringify(analysis))

    return c.json({
      profileId: profile.id,
      username: profile.username,
      analysis,
      cached: false,
      isOwner: true,
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return c.json({ error: 'Failed to refresh profile' }, 500)
  }
})
