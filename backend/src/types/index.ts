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
  type: 'concentration' | 'directional_bias' | 'low_upside' | 'high_exposure'
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

export interface OrderResult {
  orderId: string
  ticker: string
  status: string
  side: string
  action: string
  count: number
  price: number
}
