export interface KalshiCredentials {
  apiKeyId: string
  privateKeyPem: string
}

export interface PersonalityAnalysis {
  // Category distribution
  categories: {
    name: string
    count: number
    percentage: number
  }[]

  // Risk profile
  riskProfile: {
    type: 'high_risk' | 'moderate' | 'conservative'
    avgEntryPrice: number
    lowRiskCount: number   // > 70¢
    midRiskCount: number   // 30-70¢
    highRiskCount: number  // < 30¢
  }

  // Win rate
  winRate: {
    wins: number
    losses: number
    percentage: number
  }

  // ROI
  roi: {
    totalRevenue: number
    totalCost: number
    percentage: number
  }

  // Trading frequency
  frequency: {
    totalTrades: number
    activeDays: number
    tradesPerDay: number
  }

  // Personality tag
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
