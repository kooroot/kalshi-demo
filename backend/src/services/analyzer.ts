import type { PersonalityAnalysis, KalshiCredentials, MarketRecommendation } from '../types'
import { getFills, getSettlements, getMarkets, getEvent, getSeries } from './kalshi'
import { getSocialMetrics, getSocialTrades, getSocialHoldings, getSocialCategoryMetrics } from './kalshi-social'

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
    // Kalshi API only provides yes_price; no_price = 100 - yes_price
    const noPrice = 100 - fill.yes_price
    const entryPrice = fill.side === 'yes' ? fill.yes_price : noPrice

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

  // 3. Win rate (revenue-based: actual profit determines win/loss)
  let wins = 0
  let losses = 0

  for (const s of settlements) {
    if (s.market_result === 'void') continue

    const totalCostForMarket = s.yes_total_cost + s.no_total_cost
    if (totalCostForMarket === 0) continue

    // Revenue > cost = profitable = win
    if (s.revenue > totalCostForMarket) wins++
    else losses++
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

export async function analyzeFromSocial(nickname: string): Promise<PersonalityAnalysis> {
  // Fetch all social data in parallel
  const [metrics, trades, closedHoldings, categoryMetrics] = await Promise.all([
    getSocialMetrics(nickname),
    getSocialTrades(nickname),
    getSocialHoldings(nickname, true),
    getSocialCategoryMetrics(nickname),
  ])

  // 1. Category distribution from category metrics
  const totalCategoryValue = categoryMetrics.reduce((sum, cm) => sum + Math.abs(cm.value), 0)
  const categories = categoryMetrics
    .map(cm => ({
      name: cm.category || cm.tag || 'Unknown',
      count: Math.abs(cm.value),
      percentage: totalCategoryValue > 0 ? Math.round((Math.abs(cm.value) / totalCategoryValue) * 100) : 0,
    }))
    .filter(c => c.percentage > 0)
    .sort((a, b) => b.count - a.count)

  // 2. Risk profile from trade prices
  let lowRiskCount = 0
  let midRiskCount = 0
  let highRiskCount = 0
  let totalPrice = 0

  for (const trade of trades) {
    const price = trade.price // already 0-100 range (cents)
    totalPrice += price

    if (price < 30) highRiskCount++
    else if (price > 70) lowRiskCount++
    else midRiskCount++
  }

  const avgEntryPrice = trades.length > 0 ? Math.round(totalPrice / trades.length) : 50
  let riskType: 'high_risk' | 'moderate' | 'conservative' = 'moderate'

  if (highRiskCount > lowRiskCount && highRiskCount > midRiskCount) {
    riskType = 'high_risk'
  } else if (lowRiskCount > highRiskCount && lowRiskCount > midRiskCount) {
    riskType = 'conservative'
  }

  // 3. Win rate from closed holdings (nested: event → market_holdings[])
  let wins = 0
  let losses = 0

  for (const holding of closedHoldings) {
    for (const mh of holding.market_holdings) {
      if (mh.pnl > 0) wins++
      else if (mh.pnl < 0) losses++
    }
  }

  const winPercentage = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  // 4. ROI from metrics
  // pnl is in cents, volume is contract count
  // Estimate total cost from trades: sum(price * count) for each trade
  let estimatedTotalCost = 0
  for (const trade of trades) {
    estimatedTotalCost += trade.price * trade.count
  }
  const pnl = metrics.pnl || 0 // cents
  const totalCostCents = estimatedTotalCost || 1
  const roiPercentage = totalCostCents > 0 ? Math.round((pnl / totalCostCents) * 100) : 0

  // 5. Trading frequency from trades
  const tradeDates = new Set<string>()
  for (const trade of trades) {
    if (trade.create_date) {
      const date = trade.create_date.split('T')[0]
      tradeDates.add(date)
    }
  }

  const activeDays = tradeDates.size || 1
  const totalTrades = trades.length
  const tradesPerDay = Math.round((totalTrades / activeDays) * 10) / 10

  const partialAnalysis = {
    categories,
    riskProfile: {
      type: riskType,
      avgEntryPrice,
      lowRiskCount,
      midRiskCount,
      highRiskCount,
    },
    winRate: {
      wins,
      losses,
      percentage: winPercentage,
    },
    roi: {
      totalRevenue: totalCostCents + pnl,
      totalCost: totalCostCents,
      percentage: roiPercentage,
    },
    frequency: {
      totalTrades,
      activeDays,
      tradesPerDay,
    },
  }

  const tag = determinePersonalityTag(partialAnalysis)

  return { ...partialAnalysis, tag }
}

export async function getRecommendations(
  credentials: KalshiCredentials,
  analysis: PersonalityAnalysis
): Promise<MarketRecommendation[]> {
  // Get user's traded tickers to exclude
  const fillsData = await getFills(credentials)
  const tradedTickers = new Set(fillsData.fills.map(f => f.ticker))

  // Build category win rate map from settlements
  const settlementsData = await getSettlements(credentials)
  const categoryStats = new Map<string, { wins: number; total: number }>()
  for (const s of settlementsData.settlements) {
    if (s.market_result === 'void') continue
    const cat = await getMarketCategory(s.event_ticker)
    const stats = categoryStats.get(cat) || { wins: 0, total: 0 }
    stats.total++
    if (s.revenue > (s.yes_total_cost + s.no_total_cost)) stats.wins++
    categoryStats.set(cat, stats)
  }

  // Get open markets
  const marketsData = await getMarkets({ status: 'open', limit: 100 })

  // Filter and score markets
  const scoredMarkets: Array<{
    market: typeof marketsData.markets[0]
    score: number
    reasons: string[]
    category: string
  }> = []

  for (const market of marketsData.markets) {
    if (tradedTickers.has(market.ticker)) continue
    if (!market.yes_bid || !market.yes_ask) continue

    let score = 0
    const reasons: string[] = []
    const midPrice = (market.yes_bid + market.yes_ask) / 2

    // 1. Price match based on risk profile (30 pts)
    if (analysis.riskProfile.type === 'high_risk' && midPrice < 30) {
      score += 30
      reasons.push('High-risk opportunity')
    } else if (analysis.riskProfile.type === 'conservative' && midPrice > 70) {
      score += 30
      reasons.push('Conservative play')
    } else if (analysis.riskProfile.type === 'moderate' && midPrice >= 30 && midPrice <= 70) {
      score += 25
      reasons.push('Balanced odds')
    }

    // 2. Volume & liquidity (20 pts)
    const volume = market.volume_24h || 0
    const oi = market.open_interest || 0
    if (volume > 5000 || oi > 1000) {
      score += 20
      reasons.push('High liquidity')
    } else if (volume > 1000) {
      score += 10
    }

    // 3. Category match with win rate weighting (35 pts)
    let marketCategory = 'Unknown'
    try {
      marketCategory = await getMarketCategory(market.event_ticker)
      const topCategories = analysis.categories.slice(0, 3).map(c => c.name.toLowerCase())

      if (topCategories.some(tc => marketCategory.toLowerCase().includes(tc))) {
        const catStats = categoryStats.get(marketCategory)
        const winRate = catStats && catStats.total > 0 ? catStats.wins / catStats.total : 0

        if (winRate > 0.6) {
          score += 35
          reasons.push(`${Math.round(winRate * 100)}% win rate in ${marketCategory}`)
        } else if (winRate > 0) {
          score += 20
          reasons.push(`Active in ${marketCategory}`)
        } else {
          score += 15
          reasons.push(`Favorite sector: ${marketCategory}`)
        }
      }
    } catch {
      // Skip
    }

    if (score > 0) {
      scoredMarkets.push({ market, score, reasons, category: marketCategory })
    }
  }

  // Sort by score
  scoredMarkets.sort((a, b) => b.score - a.score)

  // Diversity: max 3 per category
  const categoryCounts = new Map<string, number>()
  const diverseResults: typeof scoredMarkets = []

  for (const item of scoredMarkets) {
    const count = categoryCounts.get(item.category) || 0
    if (count >= 3) continue
    categoryCounts.set(item.category, count + 1)
    diverseResults.push(item)
    if (diverseResults.length >= 10) break
  }

  // Resolve proper event titles for recommendations
  const results: MarketRecommendation[] = []
  for (const { market, reasons, category } of diverseResults) {
    let title = market.title || market.yes_sub_title || market.ticker
    // Try to get a better title from event data
    try {
      const eventData = await getEvent(market.event_ticker)
      const eventTitle = eventData.event.title
      // Use event title + market subtitle for clarity
      if (eventTitle && market.yes_sub_title && market.yes_sub_title !== eventTitle) {
        title = `${eventTitle}: ${market.yes_sub_title}`
      } else if (eventTitle) {
        title = eventTitle
      }
    } catch {
      // Keep existing title
    }

    results.push({
      ticker: market.ticker,
      eventTicker: market.event_ticker,
      title,
      category,
      yesBid: market.yes_bid_dollars || `$${(market.yes_bid / 100).toFixed(2)}`,
      yesAsk: market.yes_ask_dollars || `$${(market.yes_ask / 100).toFixed(2)}`,
      volume24h: market.volume_24h_fp || market.volume_24h?.toString() || '0',
      reason: reasons.join(' · '),
      kalshiUrl: `https://demo.kalshi.co/markets/${market.event_ticker}`,
    })
  }

  return results
}
