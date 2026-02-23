import { Hono } from 'hono'
import { credentialsStore, usernameToProfileId } from './connect'
import { analyzePortfolioRisk, analyzeOrderbook, calculateHedge } from '../services/shield'
import { getBalance, createOrder } from '../services/kalshi'
import { getProfileByUsername } from '../db'

export const dashboardRoute = new Hono()

function resolveProfileId(identifier: string): string {
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  if (!isUUID) {
    // Try in-memory map first
    const mapped = usernameToProfileId.get(identifier.toLowerCase())
    if (mapped) return mapped
    // Fallback to DB lookup
    const profile = getProfileByUsername(identifier)
    if (profile) return profile.id
  }
  return identifier
}

function getCredentials(identifier: string) {
  const profileId = resolveProfileId(identifier)
  const creds = credentialsStore.get(profileId)
  if (!creds) return null
  return creds
}

// Portfolio positions + risk analysis
dashboardRoute.get('/positions/:id', async (c) => {
  const id = c.req.param('id')
  const credentials = getCredentials(id)

  if (!credentials) {
    return c.json({ error: 'Session expired. Please reconnect.', needsReconnect: true }, 401)
  }

  try {
    const risk = await analyzePortfolioRisk(credentials)
    return c.json(risk)
  } catch (error) {
    console.error('Portfolio risk error:', error)
    return c.json({ error: 'Failed to analyze portfolio' }, 500)
  }
})

// Balance
dashboardRoute.get('/balance/:id', async (c) => {
  const id = c.req.param('id')
  const credentials = getCredentials(id)

  if (!credentials) {
    return c.json({ error: 'Session expired. Please reconnect.', needsReconnect: true }, 401)
  }

  try {
    const balanceData = await getBalance(credentials)
    return c.json({
      // Kalshi balance is in cents
      // $1.00 = 100 cents
      balanceCents: balanceData.balance,
      balanceDollars: (balanceData.balance / 100).toFixed(2),
      portfolioValueCents: balanceData.portfolio_value,
      portfolioValueDollars: (balanceData.portfolio_value / 100).toFixed(2),
    })
  } catch (error) {
    console.error('Balance error:', error)
    return c.json({ error: 'Failed to fetch balance' }, 500)
  }
})

// Orderbook analysis
dashboardRoute.get('/orderbook/:ticker', async (c) => {
  const ticker = c.req.param('ticker')

  try {
    const analysis = await analyzeOrderbook(ticker)
    return c.json(analysis)
  } catch (error) {
    console.error('Orderbook error:', error)
    return c.json({ error: 'Failed to fetch orderbook' }, 500)
  }
})

// Hedge calculation
dashboardRoute.post('/hedge/calculate', async (c) => {
  try {
    const body = await c.req.json()
    const { ticker, hedgeSide, defenseAmount } = body

    if (!ticker || !hedgeSide || !defenseAmount) {
      return c.json({ error: 'Missing ticker, hedgeSide, or defenseAmount' }, 400)
    }

    const orderbook = await analyzeOrderbook(ticker)
    const calculation = calculateHedge(orderbook, hedgeSide, defenseAmount)

    return c.json({ calculation, orderbook })
  } catch (error) {
    console.error('Hedge calc error:', error)
    return c.json({ error: 'Failed to calculate hedge' }, 500)
  }
})

// Execute hedge order
dashboardRoute.post('/hedge/execute/:id', async (c) => {
  const id = c.req.param('id')
  const credentials = getCredentials(id)

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
        error: `Insufficient balance. Need ${(totalCost / 100).toFixed(2)} but only have $${(balanceCents / 100).toFixed(2)}`,
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
    console.error('Hedge execute error:', error)
    const message = error instanceof Error ? error.message : 'Failed to execute hedge order'
    return c.json({ error: message }, 500)
  }
})
