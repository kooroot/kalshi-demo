import { Hono } from 'hono'
import { getProfile, updateProfileCache } from '../db'
import { analyzePersonality } from '../services/analyzer'
import { credentialsStore } from './connect'

export const profileRoute = new Hono()

profileRoute.get('/:id', async (c) => {
  try {
    const profileId = c.req.param('id')

    // Get profile from DB
    const profile = getProfile(profileId)

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    // Check if we have cached analysis (less than 5 minutes old)
    const cacheMaxAge = 5 * 60 * 1000 // 5 minutes
    const now = Date.now()

    if (profile.analysis_cache && profile.updated_at && (now - profile.updated_at) < cacheMaxAge) {
      const cachedAnalysis = JSON.parse(profile.analysis_cache)
      return c.json({
        profileId: profile.id,
        analysis: cachedAnalysis,
        cached: true
      })
    }

    // Get credentials from memory
    const credentials = credentialsStore.get(profileId)

    if (!credentials) {
      return c.json({
        error: 'Session expired. Please reconnect your Kalshi account.',
        needsReconnect: true
      }, 401)
    }

    // Run analysis
    const analysis = await analyzePersonality(credentials)

    // Cache the result
    updateProfileCache(profileId, JSON.stringify(analysis))

    return c.json({
      profileId: profile.id,
      analysis,
      cached: false
    })
  } catch (error) {
    console.error('Profile error:', error)
    return c.json({ error: 'Failed to load profile' }, 500)
  }
})

// Force refresh analysis
profileRoute.post('/:id/refresh', async (c) => {
  try {
    const profileId = c.req.param('id')

    const profile = getProfile(profileId)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    const credentials = credentialsStore.get(profileId)
    if (!credentials) {
      return c.json({
        error: 'Session expired. Please reconnect.',
        needsReconnect: true
      }, 401)
    }

    const analysis = await analyzePersonality(credentials)
    updateProfileCache(profileId, JSON.stringify(analysis))

    return c.json({
      profileId: profile.id,
      analysis,
      cached: false
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return c.json({ error: 'Failed to refresh profile' }, 500)
  }
})
