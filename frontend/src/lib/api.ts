const API_BASE = 'http://localhost:3000/api'

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

export async function connectKalshi(apiKeyId: string, privateKeyPem: string): Promise<{ profileId: string }> {
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
  analysis: PersonalityAnalysis
  cached: boolean
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
  analysis: PersonalityAnalysis
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
