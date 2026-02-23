import { Hono } from 'hono'
import { getProfile, getProfileByUsername } from '../db'
import { getRecommendations, analyzePersonality } from '../services/analyzer'
import { credentialsStore, usernameToProfileId } from './connect'
import { getBalance, createOrder } from '../services/kalshi'
import type { Profile } from '../db'

export const recommendRoute = new Hono()

function resolveProfile(identifier: string): Profile | undefined {
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  if (!isUUID) {
    return getProfileByUsername(identifier)
  }
  return getProfile(identifier)
}

function getCredentials(identifier: string) {
  const profile = resolveProfile(identifier)
  if (!profile) return null
  return credentialsStore.get(profile.id) || null
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

// Execute order from recommendation
recommendRoute.post('/order/:id', async (c) => {
  const identifier = c.req.param('id')
  const credentials = getCredentials(identifier)

  if (!credentials) {
    return c.json({ error: 'Session expired. Please reconnect.', needsReconnect: true }, 401)
  }

  try {
    const body = await c.req.json()
    const { ticker, side, count, price } = body

    if (!ticker || !side || !count || !price) {
      return c.json({ error: 'Missing ticker, side, count, or price' }, 400)
    }

    // Verify balance
    const balanceData = await getBalance(credentials)
    const balanceCents = balanceData.balance
    const totalCost = count * price

    if (totalCost > balanceCents) {
      return c.json({
        error: `Insufficient balance. Need $${(totalCost / 100).toFixed(2)} but only have $${(balanceCents / 100).toFixed(2)}`,
      }, 400)
    }

    // Place limit order
    const result = await createOrder(credentials, {
      ticker,
      action: 'buy',
      side,
      type: 'limit',
      count,
      ...(side === 'yes' ? { yes_price: price } : { no_price: price }),
    })

    return c.json({
      success: true,
      order: {
        orderId: result.order.order_id,
        ticker: result.order.ticker,
        status: result.order.status,
        side: result.order.side,
        action: result.order.action,
        count: result.order.count,
        price: side === 'yes' ? result.order.yes_price : result.order.no_price,
      },
    })
  } catch (error) {
    console.error('Order execute error:', error)
    const message = error instanceof Error ? error.message : 'Failed to execute order'
    return c.json({ error: message }, 500)
  }
})
