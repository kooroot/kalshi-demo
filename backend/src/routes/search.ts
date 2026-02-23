import { Hono } from 'hono'
import { searchProfiles } from '../db'

export const searchRoute = new Hono()

searchRoute.get('/', async (c) => {
  const query = c.req.query('q')

  if (!query || query.trim().length < 2) {
    return c.json({ error: 'Query must be at least 2 characters' }, 400)
  }

  const results = searchProfiles(query.trim())

  if (results.length === 0) {
    return c.json({ found: false, results: [] })
  }

  return c.json({
    found: true,
    results: results.map(p => ({
      username: p.username,
      profileId: p.id,
    })),
  })
})
