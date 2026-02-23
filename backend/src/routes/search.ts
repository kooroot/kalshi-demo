import { Hono } from 'hono'
import { searchProfiles } from '../db'
import { getSocialProfile } from '../services/kalshi-social'

export const searchRoute = new Hono()

searchRoute.get('/', async (c) => {
  const query = c.req.query('q')

  if (!query || query.trim().length < 2) {
    return c.json({ error: 'Query must be at least 2 characters' }, 400)
  }

  const trimmed = query.trim()

  // 1. Search local DB first
  const localResults = searchProfiles(trimmed)

  const results: Array<{ username: string | null; profileId: string; source: string }> = localResults.map(p => ({
    username: p.username,
    profileId: p.id,
    source: 'local',
  }))

  // 2. If no local exact match, check Kalshi Social API
  const hasExactLocal = localResults.some(
    p => p.username?.toLowerCase() === trimmed.toLowerCase()
  )

  if (!hasExactLocal) {
    try {
      const socialProfile = await getSocialProfile(trimmed)
      if (socialProfile) {
        // Add Kalshi result — avoid duplicate if already in partial match results
        const alreadyInResults = results.some(
          r => r.username?.toLowerCase() === trimmed.toLowerCase()
        )
        if (!alreadyInResults) {
          results.unshift({
            username: socialProfile.nickname || trimmed,
            profileId: '', // no local profile yet
            source: 'kalshi' as const,
          })
        }
      }
    } catch {
      // Social API lookup failed, just return local results
    }
  }

  if (results.length === 0) {
    return c.json({ found: false, results: [] })
  }

  return c.json({
    found: true,
    results,
  })
})
