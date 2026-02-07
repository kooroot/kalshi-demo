import type { PersonalityAnalysis, KalshiCredentials, MarketRecommendation } from '../types'
import { getFills, getSettlements, getMarkets, getEvent, getSeries } from './kalshi'

interface FillData {
  ticker: string
  side: 'yes' | 'no'
  action: 'buy' | 'sell'
  yes_price: number
  created_time: string
}

interface SettlementData {
  ticker: string
  event_ticker: string
  market_result: 'yes' | 'no' | 'void'
  yes_count: number
  no_count: number
  yes_total_cost: number
  no_total_cost: number
  revenue: number
}

// Cache for event/series data to minimize API calls
const categoryCache = new Map<string, string>()

async function getMarketCategory(eventTicker: string): Promise<string> {
  if (categoryCache.has(eventTicker)) {
    return categoryCache.get(eventTicker)!
  }

  try {
    const eventData = await getEvent(eventTicker)
    const category = eventData.event.category || 'Unknown'
    categoryCache.set(eventTicker, category)
    return category
  } catch {
    return 'Unknown'
  }
}

function determinePersonalityTag(analysis: Omit<PersonalityAnalysis, 'tag'>): PersonalityAnalysis['tag'] {
  const { riskProfile, winRate, frequency, categories } = analysis

  // High risk + high frequency = Degen Gambler
  if (riskProfile.type === 'high_risk' && frequency.tradesPerDay > 3) {
    return {
      name: 'Degen Gambler',
      emoji: '🎰',
      description: 'Lives for the thrill. High risk, high reward mentality.'
    }
  }

  // Conservative + high win rate = Safe Player
  if (riskProfile.type === 'conservative' && winRate.percentage > 60) {
    return {
      name: 'Safe Player',
      emoji: '🛡️',
      description: 'Calculated and careful. Prefers sure bets over long shots.'
    }
  }

  // Politics focus
  const topCategory = categories[0]?.name?.toLowerCase()
  if (topCategory?.includes('politic') || topCategory?.includes('election')) {
    return {
      name: 'Political Junkie',
      emoji: '🏛️',
      description: 'Obsessed with political markets. Always following the polls.'
    }
  }

  // Crypto focus
  if (topCategory?.includes('crypto') || topCategory?.includes('bitcoin')) {
    return {
      name: 'Crypto Degen',
      emoji: '₿',
      description: 'Rides the crypto waves. High volatility is home.'
    }
  }

  // Diverse categories = Explorer
  if (categories.length >= 4) {
    return {
      name: 'Curious Explorer',
      emoji: '🔍',
      description: 'Diverse portfolio. Always looking for new opportunities.'
    }
  }

  // High frequency trader
  if (frequency.tradesPerDay > 5) {
    return {
      name: 'Speed Demon',
      emoji: '⚡',
      description: 'Rapid-fire trader. Moves fast and takes chances.'
    }
  }

  // Moderate everything = Balanced
  if (riskProfile.type === 'moderate' && winRate.percentage >= 45 && winRate.percentage <= 55) {
    return {
      name: 'Balanced Trader',
      emoji: '⚖️',
      description: 'Steady and measured. Neither too risky nor too safe.'
    }
  }

  // Default
  return {
    name: 'Rising Trader',
    emoji: '📈',
    description: 'Building experience. Every trade is a learning opportunity.'
  }
}

export async function analyzePersonality(credentials: KalshiCredentials): Promise<PersonalityAnalysis> {
  // Fetch data
  const [fillsData, settlementsData] = await Promise.all([
    getFills(credentials),
    getSettlements(credentials)
  ])

  const fills = fillsData.fills
  const settlements = settlementsData.settlements

  // 1. Category distribution
  const categoryCount = new Map<string, number>()
  const eventTickers = new Set<string>()

  // Get unique event tickers from settlements
  for (const s of settlements) {
    eventTickers.add(s.event_ticker)
  }

  // Fetch categories
  for (const eventTicker of eventTickers) {
    const category = await getMarketCategory(eventTicker)
    categoryCount.set(category, (categoryCount.get(category) || 0) + 1)
  }

  const totalCategoryCount = Array.from(categoryCount.values()).reduce((a, b) => a + b, 0)
  const categories = Array.from(categoryCount.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalCategoryCount > 0 ? Math.round((count / totalCategoryCount) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  // 2. Risk profile (based on entry prices)
  let lowRiskCount = 0   // > 70¢
  let midRiskCount = 0   // 30-70¢
  let highRiskCount = 0  // < 30¢
  let totalPrice = 0

  for (const fill of fills) {
    // For buys, use the price of the side they bought
    const entryPrice = fill.action === 'buy'
      ? (fill.side === 'yes' ? fill.yes_price : fill.no_price)
      : (fill.side === 'yes' ? fill.yes_price : fill.no_price)

    totalPrice += entryPrice

    if (entryPrice < 30) highRiskCount++
    else if (entryPrice > 70) lowRiskCount++
    else midRiskCount++
  }

  const avgEntryPrice = fills.length > 0 ? totalPrice / fills.length : 50
  let riskType: 'high_risk' | 'moderate' | 'conservative' = 'moderate'

  if (highRiskCount > lowRiskCount && highRiskCount > midRiskCount) {
    riskType = 'high_risk'
  } else if (lowRiskCount > highRiskCount && lowRiskCount > midRiskCount) {
    riskType = 'conservative'
  }

  // 3. Win rate
  let wins = 0
  let losses = 0

  for (const s of settlements) {
    if (s.market_result === 'void') continue

    // Win if we had position on winning side
    const hadYes = s.yes_count > 0
    const hadNo = s.no_count > 0

    if (s.market_result === 'yes' && hadYes) wins++
    else if (s.market_result === 'no' && hadNo) wins++
    else if (hadYes || hadNo) losses++
  }

  const winPercentage = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  // 4. ROI
  let totalRevenue = 0
  let totalCost = 0

  for (const s of settlements) {
    totalRevenue += s.revenue
    totalCost += s.yes_total_cost + s.no_total_cost
  }

  const roiPercentage = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0

  // 5. Trading frequency
  const tradeDates = new Set<string>()
  for (const fill of fills) {
    const date = fill.created_time.split('T')[0]
    tradeDates.add(date)
  }

  const activeDays = tradeDates.size || 1
  const tradesPerDay = Math.round((fills.length / activeDays) * 10) / 10

  // Build partial analysis
  const partialAnalysis = {
    categories,
    riskProfile: {
      type: riskType,
      avgEntryPrice: Math.round(avgEntryPrice),
      lowRiskCount,
      midRiskCount,
      highRiskCount
    },
    winRate: {
      wins,
      losses,
      percentage: winPercentage
    },
    roi: {
      totalRevenue,
      totalCost,
      percentage: roiPercentage
    },
    frequency: {
      totalTrades: fills.length,
      activeDays,
      tradesPerDay
    }
  }

  // Determine personality tag
  const tag = determinePersonalityTag(partialAnalysis)

  return {
    ...partialAnalysis,
    tag
  }
}

export async function getRecommendations(
  credentials: KalshiCredentials,
  analysis: PersonalityAnalysis
): Promise<MarketRecommendation[]> {
  // Get user's traded tickers to exclude
  const fillsData = await getFills(credentials)
  const tradedTickers = new Set(fillsData.fills.map(f => f.ticker))

  // Get open markets
  const marketsData = await getMarkets({ status: 'open', limit: 100 })

  // Filter and score markets
  const scoredMarkets: Array<{
    market: typeof marketsData.markets[0]
    score: number
    reason: string
  }> = []

  for (const market of marketsData.markets) {
    // Skip already traded
    if (tradedTickers.has(market.ticker)) continue

    // Skip if no liquidity
    if (!market.yes_bid || !market.yes_ask) continue

    let score = 0
    let reason = ''

    // Price match based on risk profile
    const midPrice = (market.yes_bid + market.yes_ask) / 2

    if (analysis.riskProfile.type === 'high_risk' && midPrice < 30) {
      score += 30
      reason = 'Matches your high-risk style'
    } else if (analysis.riskProfile.type === 'conservative' && midPrice > 70) {
      score += 30
      reason = 'Safe bet matching your style'
    } else if (analysis.riskProfile.type === 'moderate' && midPrice >= 30 && midPrice <= 70) {
      score += 30
      reason = 'Balanced opportunity'
    }

    // Volume bonus
    if (market.volume_24h > 1000) {
      score += 20
      if (!reason) reason = 'High trading activity'
    }

    // Category match (if we can determine it)
    try {
      const category = await getMarketCategory(market.event_ticker)
      const topCategories = analysis.categories.slice(0, 2).map(c => c.name.toLowerCase())

      if (topCategories.some(tc => category.toLowerCase().includes(tc))) {
        score += 25
        reason = `In your favorite category: ${category}`
      }
    } catch {
      // Skip category matching if we can't fetch
    }

    if (score > 0) {
      scoredMarkets.push({ market, score, reason })
    }
  }

  // Sort by score and take top 10
  scoredMarkets.sort((a, b) => b.score - a.score)

  return scoredMarkets.slice(0, 10).map(({ market, reason }) => ({
    ticker: market.ticker,
    eventTicker: market.event_ticker,
    title: market.yes_sub_title || market.title || market.ticker,
    category: 'Market', // Will be enriched later
    yesBid: market.yes_bid_dollars || `$${(market.yes_bid / 100).toFixed(2)}`,
    yesAsk: market.yes_ask_dollars || `$${(market.yes_ask / 100).toFixed(2)}`,
    volume24h: market.volume_24h_fp || market.volume_24h?.toString() || '0',
    reason,
    kalshiUrl: `https://demo.kalshi.co/markets/${market.event_ticker}`
  }))
}
