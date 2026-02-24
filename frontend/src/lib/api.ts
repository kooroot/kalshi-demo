const API_BASE = 'http://localhost:3003/api'

export interface PersonalityAnalysis {
  categories: {
    name: string
    count: number
    percentage: number
  }[]
  riskProfile: {
    type: 'high_risk' | 'moderate' | 'conservative'
    avgEntryPrice: number
    lowRiskCount: number
    midRiskCount: number
    highRiskCount: number
  }
  winRate: {
    wins: number
    losses: number
    percentage: number
  }
  roi: {
    totalRevenue: number
    totalCost: number
    percentage: number
  }
  frequency: {
    totalTrades: number
    activeDays: number
    tradesPerDay: number
  }
  tag: {
    name: string
    emoji: string
    description: string
  }
  categoryPerformance?: CategoryPerformance[]
  pnlAnalysis?: PnlAnalysis
  temporal?: TemporalAnalysis
  sideBias?: SideBias
  traits?: TraitBadge[]
  scores?: PersonalityScores
}

export interface CategoryPerformance {
  category: string
  wins: number
  losses: number
  winRate: number
  totalPnl: number
  avgPnl: number
  roi: number
  tradeCount: number
}

export interface PnlAnalysis {
  avgWinSize: number
  avgLossSize: number
  profitFactor: number
  biggestWin: number
  biggestLoss: number
  expectancy: number
}

export interface TemporalAnalysis {
  recentWinRate: number
  historicalWinRate: number
  recentRoi: number
  historicalRoi: number
  trend: 'improving' | 'declining' | 'stable'
  currentStreak: { type: 'win' | 'loss'; count: number }
  longestWinStreak: number
  longestLossStreak: number
}

export interface SideBias {
  yesBuyCount: number
  noBuyCount: number
  yesBuyPercentage: number
  bias: 'yes_heavy' | 'no_heavy' | 'balanced'
}

export interface TraitBadge {
  name: string
  emoji: string
}

export interface PersonalityScores {
  riskAppetite: number
  diversification: number
  frequency: number
  skill: number
  trend: number
  conviction: number
}

export interface MarketRecommendation {
  ticker: string
  eventTicker: string
  title: string
  category: string
  yesBid: string
  yesAsk: string
  volume24h: string
  reason: string
  kalshiUrl: string
}

export async function connectKalshi(apiKeyId: string, privateKeyPem: string): Promise<{ profileId: string; username: string | null }> {
  const response = await fetch(`${API_BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKeyId, privateKeyPem }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to connect')
  }

  return response.json()
}

export async function getProfile(profileId: string): Promise<{
  profileId: string
  username: string | null
  analysis: PersonalityAnalysis
  cached: boolean
  isOwner: boolean
  source?: 'live' | 'cached' | 'social'
}> {
  const response = await fetch(`${API_BASE}/profile/${profileId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load profile')
  }

  return response.json()
}

export async function refreshProfile(profileId: string): Promise<{
  profileId: string
  username: string | null
  analysis: PersonalityAnalysis
  isOwner: boolean
}> {
  const response = await fetch(`${API_BASE}/profile/${profileId}/refresh`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to refresh profile')
  }

  return response.json()
}

export async function getRecommendations(profileId: string): Promise<{
  profileId: string
  recommendations: MarketRecommendation[]
}> {
  const response = await fetch(`${API_BASE}/recommend/${profileId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get recommendations')
  }

  return response.json()
}

export interface SearchResult {
  username: string
  profileId: string
  source?: 'local' | 'kalshi'
}

export async function searchProfiles(query: string): Promise<{
  found: boolean
  results: SearchResult[]
}> {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Search failed')
  }

  return response.json()
}

export async function setUsername(profileId: string, username: string): Promise<{ success: boolean; username: string }> {
  const response = await fetch(`${API_BASE}/profile/${profileId}/username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to set username')
  }

  return response.json()
}

// Shield types
export interface PositionData {
  ticker: string
  eventTicker: string
  title: string
  side: 'yes' | 'no'
  quantity: number
  avgPrice: number
  currentPrice: number
  marketExposure: number
  unrealizedPnl: number
  category: string
}

export interface RiskAlert {
  type: string
  severity: 'warning' | 'critical'
  message: string
  detail: string
}

export interface PortfolioRisk {
  positions: PositionData[]
  totalExposure: number
  totalUnrealizedPnl: number
  categoryBreakdown: { name: string; percentage: number; exposure: number }[]
  directionBias: { yes: number; no: number }
  alerts: RiskAlert[]
}

export interface OrderbookAnalysis {
  ticker: string
  bestYesBid: number
  bestYesAsk: number
  bestNoBid: number
  bestNoAsk: number
  spread: number
  yesBids: Array<{ price: number; quantity: number }>
  noBids: Array<{ price: number; quantity: number }>
}

export interface HedgeCalculation {
  ticker: string
  hedgeSide: 'yes' | 'no'
  contractsNeeded: number
  pricePerContract: number
  totalCost: number
  effectiveAvgPrice: number
  slippage: number
  potentialPayout: number
  defenseAmount: number
  costAsPercentage: number
}

export interface BalanceData {
  balanceCents: number
  balanceDollars: string
  portfolioValueCents: number
  portfolioValueDollars: string
}

// Shield API functions
export async function getPortfolioRisk(profileId: string): Promise<PortfolioRisk> {
  const response = await fetch(`${API_BASE}/dashboard/positions/${profileId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load positions')
  }
  return response.json()
}

export async function getBalance(profileId: string): Promise<BalanceData> {
  const response = await fetch(`${API_BASE}/dashboard/balance/${profileId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load balance')
  }
  return response.json()
}

export async function getOrderbook(ticker: string): Promise<OrderbookAnalysis> {
  const response = await fetch(`${API_BASE}/dashboard/orderbook/${ticker}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to load orderbook')
  }
  return response.json()
}

export async function calculateHedge(ticker: string, hedgeSide: 'yes' | 'no', defenseAmount: number): Promise<{
  calculation: HedgeCalculation
  orderbook: OrderbookAnalysis
}> {
  const response = await fetch(`${API_BASE}/dashboard/hedge/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, hedgeSide, defenseAmount }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to calculate hedge')
  }
  return response.json()
}

export async function executeHedge(profileId: string, params: {
  ticker: string
  side: 'yes' | 'no'
  count: number
  price: number
}): Promise<{ success: boolean; order: { orderId: string; ticker: string; status: string; side: string; count: number; price: number } }> {
  const response = await fetch(`${API_BASE}/dashboard/hedge/execute/${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to execute hedge')
  }
  return response.json()
}

// Execute order from recommendation
export async function executeRecommendOrder(profileId: string, params: {
  ticker: string
  side: 'yes' | 'no'
  count: number
  price: number
}): Promise<{ success: boolean; order: { orderId: string; ticker: string; status: string; side: string; count: number; price: number } }> {
  const response = await fetch(`${API_BASE}/recommend/order/${profileId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to execute order')
  }
  return response.json()
}
