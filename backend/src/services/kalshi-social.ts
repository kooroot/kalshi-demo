const SOCIAL_BASE = 'https://demo-api.kalshi.co/v1/social'

async function socialFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${SOCIAL_BASE}${path}`)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Kalshi Social API error: ${response.status} - ${error}`)
  }

  return response.json() as Promise<T>
}

export interface SocialProfile {
  social_id: string
  nickname: string
  joined_at: string
  follower_count: number
  following_count: number
  profile_view_count: number
  [key: string]: unknown
}

export interface SocialMetrics {
  volume: number
  pnl: number
  open_interest: number
  num_markets_traded: number
  [key: string]: unknown
}

export interface SocialTrade {
  trade_id: string
  ticker: string
  price: number
  price_dollars: string
  count: number
  taker_side: 'yes' | 'no'
  taker_action: 'buy' | 'sell'
  create_date: string
  [key: string]: unknown
}

export interface SocialMarketHolding {
  market_id: string
  market_ticker: string
  signed_open_position: number
  pnl: number
}

export interface SocialHolding {
  event_ticker: string
  series_ticker: string
  total_absolute_position: number
  market_holdings: SocialMarketHolding[]
}

export interface SocialCategoryMetric {
  value: number
  tag: string
  category: string
}

export async function getSocialProfile(nickname: string): Promise<SocialProfile | null> {
  try {
    const data = await socialFetch<{ social_profile: SocialProfile }>(
      `/profile?nickname=${encodeURIComponent(nickname)}`
    )
    return data.social_profile ?? null
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return null
    throw e
  }
}

export async function getSocialMetrics(nickname: string): Promise<SocialMetrics> {
  const data = await socialFetch<{ metrics: SocialMetrics }>(
    `/profile/metrics?nickname=${encodeURIComponent(nickname)}`
  )
  return data.metrics
}

export async function getSocialTrades(nickname: string): Promise<SocialTrade[]> {
  const allTrades: SocialTrade[] = []
  let cursor: string | null = null

  do {
    const params = new URLSearchParams({
      nickname,
      limit: '500',
    })
    if (cursor) params.set('cursor', cursor)

    const data = await socialFetch<{ trades: SocialTrade[]; cursor?: string | null }>(
      `/trades?${params}`
    )
    allTrades.push(...(data.trades ?? []))
    cursor = data.cursor ?? null
  } while (cursor)

  return allTrades
}

export async function getSocialHoldings(nickname: string, closed: boolean): Promise<SocialHolding[]> {
  try {
    const allHoldings: SocialHolding[] = []
    let cursor: string | null = null

    do {
      const params = new URLSearchParams({
        nickname,
        closed_positions: String(closed),
        limit: '500',
      })
      if (cursor) params.set('cursor', cursor)

      const data = await socialFetch<{ holdings: SocialHolding[]; cursor?: string | null }>(
        `/profile/holdings?${params}`
      )
      allHoldings.push(...(data.holdings ?? []))
      cursor = data.cursor ?? null
    } while (cursor)

    return allHoldings
  } catch {
    // Holdings endpoint may fail — return empty
    return []
  }
}

export async function getSocialCategoryMetrics(nickname: string): Promise<SocialCategoryMetric[]> {
  const data = await socialFetch<{ rank_list: SocialCategoryMetric[] }>(
    `/profile/category_metric?nickname=${encodeURIComponent(nickname)}&metric_name=projected_pnl`
  )
  return data.rank_list ?? []
}
