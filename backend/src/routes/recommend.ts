import { Hono } from 'hono'
import { getProfile, getProfileByUsername } from '../db'
import { getRecommendations, analyzePersonality } from '../services/analyzer'
import { credentialsStore, usernameToProfileId } from './connect'
import type { Profile } from '../db'

export const recommendRoute = new Hono()

function resolveProfile(identifier: string): Profile | undefined {
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  if (!isUUID) {
    return getProfileByUsername(identifier)
  }
  return getProfile(identifier)
}

recommendRoute.get('/:id', async (c) => {
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
      profileId: profile.id,
      recommendations
    })
  } catch (error) {
    console.error('Recommend error:', error)
    return c.json({ error: 'Failed to get recommendations' }, 500)
  }
})
