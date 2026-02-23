import crypto from 'crypto'
import type { KalshiCredentials } from '../types'

const DEMO_BASE_URL = 'https://demo-api.kalshi.co'
const API_PATH_PREFIX = '/trade-api/v2'

function signRequest(privateKeyPem: string, timestamp: string, method: string, path: string): string {
  // Path must include /trade-api/v2 prefix but NOT query parameters
  const pathWithoutQuery = path.split('?')[0]
  const message = `${timestamp}${method}${pathWithoutQuery}`
  console.log('🔐 Signing message:', message)

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(message)
  return sign.sign({
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_MAX_LENGTH
  }, 'base64')
}

function getAuthHeaders(credentials: KalshiCredentials, method: string, fullPath: string): Record<string, string> {
  const timestamp = Date.now().toString()
  const signature = signRequest(credentials.privateKeyPem, timestamp, method, fullPath)

  return {
    'KALSHI-ACCESS-KEY': credentials.apiKeyId,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signature,
    'Content-Type': 'application/json',
  }
}

async function kalshiFetch<T>(
  credentials: KalshiCredentials,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  // Full path includes the API prefix for signing
  const fullPath = `${API_PATH_PREFIX}${path}`
  const headers = getAuthHeaders(credentials, method, fullPath)

  const response = await fetch(`${DEMO_BASE_URL}${fullPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Kalshi API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// Public endpoints (no auth needed)
async function publicFetch<T>(path: string): Promise<T> {
  const fullPath = `${API_PATH_PREFIX}${path}`
  const response = await fetch(`${DEMO_BASE_URL}${fullPath}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Kalshi API error: ${response.status} - ${error}`)
  }

  return response.json()
}

// API Functions
export async function verifyCredentials(credentials: KalshiCredentials): Promise<{ valid: boolean; username?: string }> {
  try {
    const result = await kalshiFetch(credentials, 'GET', '/portfolio/balance')
    console.log('Credentials verified, balance:', result)

    // Try to fetch username from account info
    let username: string | undefined
    try {
      const memberInfo = await kalshiFetch<{ member: { username?: string } }>(credentials, 'GET', '/members/me')
      username = memberInfo?.member?.username
    } catch {
      // Some API configs may not support this endpoint — not critical
    }

    return { valid: true, username }
  } catch (error) {
    console.error('Credential verification failed:', error)
    return { valid: false }
  }
}

export async function getBalance(credentials: KalshiCredentials) {
  return kalshiFetch<{
    balance: number
    portfolio_value: number
  }>(credentials, 'GET', '/portfolio/balance')
}

export async function getFills(credentials: KalshiCredentials, limit = 200) {
  return kalshiFetch<{
    fills: Array<{
      fill_id: string
      trade_id: string
      order_id: string
      ticker: string
      side: 'yes' | 'no'
      action: 'buy' | 'sell'
      count: number
      yes_price: number
      no_price: number
      created_time: string
      is_taker: boolean
    }>
    cursor: string | null
  }>(credentials, 'GET', `/portfolio/fills?limit=${limit}`)
}

export async function getSettlements(credentials: KalshiCredentials, limit = 200) {
  return kalshiFetch<{
    settlements: Array<{
      ticker: string
      event_ticker: string
      market_result: 'yes' | 'no' | 'void'
      yes_count: number
      no_count: number
      yes_total_cost: number
      no_total_cost: number
      revenue: number
      settled_time: string
    }>
    cursor: string | null
  }>(credentials, 'GET', `/portfolio/settlements?limit=${limit}`)
}

export async function getPositions(credentials: KalshiCredentials) {
  return kalshiFetch<{
    market_positions: Array<{
      ticker: string
      position: number
      market_exposure: number
      realized_pnl: number
      total_traded: number
    }>
  }>(credentials, 'GET', '/portfolio/positions')
}

export async function getMarket(ticker: string) {
  return publicFetch<{
    market: {
      ticker: string
      event_ticker: string
      title: string
      subtitle: string
      yes_bid: number
      yes_ask: number
      no_bid: number
      no_ask: number
      last_price: number
      volume: number
      volume_24h: number
      status: string
    }
  }>(`/markets/${ticker}`)
}

export async function getMarkets(params: {
  status?: string
  limit?: number
  cursor?: string
  series_ticker?: string
  event_ticker?: string
}) {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.cursor) searchParams.set('cursor', params.cursor)
  if (params.series_ticker) searchParams.set('series_ticker', params.series_ticker)
  if (params.event_ticker) searchParams.set('event_ticker', params.event_ticker)

  const query = searchParams.toString()
  return publicFetch<{
    markets: Array<{
      ticker: string
      event_ticker: string
      title: string
      subtitle: string
      yes_sub_title: string
      no_sub_title: string
      yes_bid: number
      yes_ask: number
      no_bid: number
      no_ask: number
      yes_bid_dollars: string
      yes_ask_dollars: string
      last_price: number
      last_price_dollars: string
      volume: number
      volume_24h: number
      volume_24h_fp: string
      status: string
      open_interest: number
    }>
    cursor: string | null
  }>(`/markets${query ? `?${query}` : ''}`)
}

export async function getEvent(eventTicker: string) {
  return publicFetch<{
    event: {
      event_ticker: string
      series_ticker: string
      title: string
      category: string
      mutually_exclusive: boolean
    }
    markets: Array<{
      ticker: string
      title: string
      yes_bid: number
      yes_ask: number
      status: string
    }>
  }>(`/events/${eventTicker}`)
}

export async function getSeries(seriesTicker: string) {
  return publicFetch<{
    series: {
      ticker: string
      title: string
      category: string
      tags: string[]
    }
  }>(`/series/${seriesTicker}`)
}

export async function getSeriesList() {
  return publicFetch<{
    series: Array<{
      ticker: string
      title: string
      category: string
      tags: string[]
    }>
  }>('/series')
}

// Orderbook
export async function getOrderbook(ticker: string) {
  return publicFetch<{
    orderbook: {
      yes: Array<[number, number]>  // [price, quantity]
      no: Array<[number, number]>
    }
  }>(`/markets/${ticker}/orderbook`)
}

// Create order
export async function createOrder(credentials: KalshiCredentials, order: {
  ticker: string
  action: 'buy' | 'sell'
  side: 'yes' | 'no'
  type: 'limit' | 'market'
  count: number
  yes_price?: number
  no_price?: number
}) {
  return kalshiFetch<{
    order: {
      order_id: string
      ticker: string
      status: string
      action: string
      side: string
      type: string
      yes_price: number
      no_price: number
      count: number
      remaining_count: number
      created_time: string
    }
  }>(credentials, 'POST', '/portfolio/orders', order)
}

// Get orders
export async function getOrders(credentials: KalshiCredentials, params?: { ticker?: string; status?: string }) {
  const searchParams = new URLSearchParams()
  if (params?.ticker) searchParams.set('ticker', params.ticker)
  if (params?.status) searchParams.set('status', params.status)
  const query = searchParams.toString()

  return kalshiFetch<{
    orders: Array<{
      order_id: string
      ticker: string
      status: string
      action: string
      side: string
      type: string
      yes_price: number
      no_price: number
      count: number
      remaining_count: number
      created_time: string
    }>
    cursor: string | null
  }>(credentials, 'GET', `/portfolio/orders${query ? `?${query}` : ''}`)
}
