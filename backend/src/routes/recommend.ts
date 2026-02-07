import { Hono } from 'hono'
import { getProfile } from '../db'
import { getRecommendations, analyzePersonality } from '../services/analyzer'
import { credentialsStore } from './connect'

export const recommendRoute = new Hono()

recommendRoute.get('/:id', async (c) => {
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

    // Get or compute analysis
    let analysis
    if (profile.analysis_cache) {
      analysis = JSON.parse(profile.analysis_cache)
    } else {
      analysis = await analyzePersonality(credentials)
    }

    // Get recommendations
    const recommendations = await getRecommendations(credentials, analysis)

    return c.json({
      profileId,
      recommendations
    })
  } catch (error) {
    console.error('Recommend error:', error)
    return c.json({ error: 'Failed to get recommendations' }, 500)
  }
})
