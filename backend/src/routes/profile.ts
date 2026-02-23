import { Hono } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { getProfile, getProfileByUsername, createProfile, updateProfileCache, updateProfileUsername } from '../db'
import { analyzePersonality, analyzeFromSocial } from '../services/analyzer'
import { getSocialProfile } from '../services/kalshi-social'
import { credentialsStore, usernameToProfileId } from './connect'
import type { Profile } from '../db'

export const profileRoute = new Hono()

// Resolve identifier: try username first, then UUID
function resolveProfile(identifier: string): Profile | undefined {
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
    let profile = resolveProfile(identifier)

    // Determine if this is the owner (has active credentials)
    const isOwner = profile ? !!credentialsStore.get(profile.id) : false

    // If profile found, try to serve from cache or live analysis
    if (profile) {
      const credentials = credentialsStore.get(profile.id)
      const isSocialProfile = profile.api_key_id.startsWith('social:')
      const cacheMaxAge = 5 * 60 * 1000 // 5 minutes

      // Fresh cache available
      if (profile.analysis_cache && profile.updated_at && (Date.now() - profile.updated_at) < cacheMaxAge) {
        const cachedAnalysis = JSON.parse(profile.analysis_cache)
        return c.json({
          profileId: profile.id,
          username: profile.username,
          analysis: cachedAnalysis,
          cached: true,
          isOwner,
          source: credentials ? 'live' : isSocialProfile ? 'social' : 'cached',
        })
      }

      // Stale cache but no credentials — serve stale for non-owner
      if (!credentials && profile.analysis_cache) {
        const cachedAnalysis = JSON.parse(profile.analysis_cache)
        return c.json({
          profileId: profile.id,
          username: profile.username,
          analysis: cachedAnalysis,
          cached: true,
          isOwner: false,
          source: isSocialProfile ? 'social' : 'cached',
        })
      }

      // Has credentials — run live analysis
      if (credentials) {
        const analysis = await analyzePersonality(credentials)
        updateProfileCache(profile.id, JSON.stringify(analysis))
        return c.json({
          profileId: profile.id,
          username: profile.username,
          analysis,
          cached: false,
          isOwner: true,
          source: 'live',
        })
      }

      // No credentials, no cache — try social API if username is set
      if (profile.username) {
        try {
          const socialProfile = await getSocialProfile(profile.username)
          if (socialProfile) {
            const analysis = await analyzeFromSocial(profile.username)
            updateProfileCache(profile.id, JSON.stringify(analysis))
            return c.json({
              profileId: profile.id,
              username: profile.username,
              analysis,
              cached: false,
              isOwner: false,
              source: 'social',
            })
          }
        } catch (e) {
          console.error('Social analysis fallback failed:', e)
        }
      }

      // Nothing worked
      return c.json({
        error: 'Session expired. Please reconnect your Kalshi account.',
        needsReconnect: true,
      }, 401)
    }

    // Profile NOT found in DB — try Kalshi Social API
    const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
    if (!isUUID) {
      try {
        const socialProfile = await getSocialProfile(identifier)
        if (socialProfile) {
          // Run social analysis
          const analysis = await analyzeFromSocial(identifier)

          // Cache in DB for future lookups
          const newId = uuidv4()
          const newProfile = createProfile(newId, `social:${identifier}`, identifier)
          updateProfileCache(newId, JSON.stringify(analysis))

          return c.json({
            profileId: newId,
            username: identifier,
            analysis,
            cached: false,
            isOwner: false,
            source: 'social',
          })
        }
      } catch (e) {
        console.error('Social profile lookup failed:', e)
      }
    }

    return c.json({ error: 'Profile not found', needsConnect: true }, 404)
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

    // Try live refresh if owner
    if (credentials) {
      const analysis = await analyzePersonality(credentials)
      updateProfileCache(profile.id, JSON.stringify(analysis))
      return c.json({
        profileId: profile.id,
        username: profile.username,
        analysis,
        cached: false,
        isOwner: true,
        source: 'live',
      })
    }

    // Try social refresh for non-owner
    if (profile.username) {
      try {
        const socialProfile = await getSocialProfile(profile.username)
        if (socialProfile) {
          const analysis = await analyzeFromSocial(profile.username)
          updateProfileCache(profile.id, JSON.stringify(analysis))
          return c.json({
            profileId: profile.id,
            username: profile.username,
            analysis,
            cached: false,
            isOwner: false,
            source: 'social',
          })
        }
      } catch (e) {
        console.error('Social refresh failed:', e)
      }
    }

    return c.json({
      error: 'Session expired. Please reconnect.',
      needsReconnect: true,
    }, 401)
  } catch (error) {
    console.error('Refresh error:', error)
    return c.json({ error: 'Failed to refresh profile' }, 500)
  }
})

// Set username for a profile
profileRoute.post('/:id/username', async (c) => {
  try {
    const identifier = c.req.param('id')
    const { username } = await c.req.json<{ username: string }>()

    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
      return c.json({ error: 'Invalid username' }, 400)
    }

    const profile = resolveProfile(identifier)
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404)
    }

    // Only owner can set username
    const credentials = credentialsStore.get(profile.id)
    if (!credentials) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Validate username exists on Kalshi
    try {
      const socialProfile = await getSocialProfile(username)
      if (!socialProfile) {
        return c.json({ error: 'Username not found on Kalshi. Please check your Kalshi profile username.' }, 404)
      }
    } catch {
      // If social API check fails, allow setting anyway (API might be down)
    }

    // Check if username is taken by another profile
    const existing = getProfileByUsername(username)
    if (existing && existing.id !== profile.id) {
      return c.json({ error: 'Username already taken' }, 409)
    }

    updateProfileUsername(profile.id, username)
    usernameToProfileId.set(username.toLowerCase(), profile.id)

    return c.json({ success: true, username })
  } catch (error) {
    console.error('Set username error:', error)
    return c.json({ error: 'Failed to set username' }, 500)
  }
})
