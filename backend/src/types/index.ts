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

  // Enhanced analysis (optional for cache compat)
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
  winRate: number        // 0-100
  totalPnl: number       // cents
  avgPnl: number         // cents per market
  roi: number            // percentage
  tradeCount: number
}

export interface PnlAnalysis {
  avgWinSize: number     // cents
  avgLossSize: number    // cents (positive number)
  profitFactor: number   // totalWinnings / totalLosses (>1.0 = good)
  biggestWin: number     // cents
  biggestLoss: number    // cents (positive)
  expectancy: number     // expected cents per trade
}

export interface TemporalAnalysis {
  recentWinRate: number      // last 25% outcomes
  historicalWinRate: number  // first 75%
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
  yesBuyPercentage: number  // 0-100
  bias: 'yes_heavy' | 'no_heavy' | 'balanced'
}

export interface TraitBadge {
  name: string
  emoji: string
}

export interface PersonalityScores {
  riskAppetite: number     // -100 ~ +100
  diversification: number  // 0 ~ 100
  frequency: number        // 0 ~ 100
  skill: number            // 0 ~ 100
  trend: number            // -100 ~ +100
  conviction: number       // 0 ~ 100
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
