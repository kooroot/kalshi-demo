import type { PersonalityAnalysis, KalshiCredentials, MarketRecommendation, CategoryPerformance, PnlAnalysis, TemporalAnalysis, SideBias, TraitBadge, PersonalityScores } from '../types'
import { getFills, getSettlements, getMarkets, getEvent, getSeries } from './kalshi'
import { getSocialTrades, getSocialHoldings } from './kalshi-social'

// ── Normalized data formats (shared between both API paths) ──

interface NormalizedTrade {
  ticker: string
  side: 'yes' | 'no'
  action: 'buy' | 'sell'
  yes_price: number // always in terms of YES price (0-100 cents)
  created_time: string
}

interface NormalizedOutcome {
  ticker: string
  event_ticker: string
  isVoid: boolean
  pnl: number      // positive = profit (cents)
  cost: number      // total cost invested (cents)
  revenue: number   // total revenue received (cents)
}

// ── Cache for event/series data to minimize API calls ──

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

// ── Enhanced personality tag determination (score-based) ──

function determineEnhancedTag(
  scores: PersonalityScores,
  riskProfile: PersonalityAnalysis['riskProfile'],
  categories: PersonalityAnalysis['categories'],
  categoryPerformance: CategoryPerformance[],
  pnlAnalysis: PnlAnalysis
): PersonalityAnalysis['tag'] {
  const topCategory = categories[0]?.name?.toLowerCase() || ''
  const topCatPerf = categoryPerformance[0]

  // Precision Sniper: skill≥70 + conservative + low freq
  if (scores.skill >= 70 && riskProfile.type === 'conservative' && scores.frequency < 50) {
    return { name: 'Precision Sniper', emoji: '🎯', description: 'Deadly accurate. Few trades, maximum impact.' }
  }

  // Momentum Rider: trend>20 + freq≥50
  if (scores.trend > 20 && scores.frequency >= 50) {
    return { name: 'Momentum Rider', emoji: '🏄', description: 'Riding the wave. Capitalizing on hot streaks with high activity.' }
  }

  // Category Specialist: top category ≥40% + category winRate≥65
  const topCat = categories[0]
  if (topCatPerf && topCat && topCat.percentage >= 40 && topCatPerf.winRate >= 65) {
    return { name: `${topCat.name} Specialist`, emoji: '🔬', description: `Deep expertise in ${topCat.name}. Focused knowledge beats broad guessing.` }
  }

  // Profit Machine: profitFactor≥2.0 + skill≥50
  if (pnlAnalysis.profitFactor >= 2.0 && scores.skill >= 50) {
    return { name: 'Profit Machine', emoji: '💰', description: 'Wins big, loses small. The math always works out.' }
  }

  // Degen Gambler: riskAppetite>50 + skill<40 + freq>40
  if (scores.riskAppetite > 50 && scores.skill < 40 && scores.frequency > 40) {
    return { name: 'Degen Gambler', emoji: '🎰', description: 'Lives for the thrill. High risk, high reward mentality.' }
  }

  // Methodical Grinder: moderate risk + positive ROI + high freq
  if (riskProfile.type === 'moderate' && pnlAnalysis.expectancy > 0 && scores.frequency >= 50) {
    return { name: 'Methodical Grinder', emoji: '⚙️', description: 'Steady accumulation. Every trade has a plan.' }
  }

  // Contrarian: NO-side heavy bias
  if (scores.riskAppetite < -20) {
    return { name: 'Contrarian', emoji: '🔄', description: 'Bets against the crowd. Profits from consensus being wrong.' }
  }

  // Safe Player: conservative + skill≥55
  if (riskProfile.type === 'conservative' && scores.skill >= 55) {
    return { name: 'Safe Player', emoji: '🛡️', description: 'Calculated and careful. Prefers sure bets over long shots.' }
  }

  // Political Junkie
  if (topCategory.includes('politic') || topCategory.includes('election')) {
    return { name: 'Political Junkie', emoji: '🏛️', description: 'Obsessed with political markets. Always following the polls.' }
  }

  // Crypto Degen
  if (topCategory.includes('crypto') || topCategory.includes('bitcoin')) {
    return { name: 'Crypto Degen', emoji: '₿', description: 'Rides the crypto waves. High volatility is home.' }
  }

  // Curious Explorer: diversification≥60
  if (scores.diversification >= 60) {
    return { name: 'Curious Explorer', emoji: '🔍', description: 'Diverse portfolio. Always looking for new opportunities.' }
  }

  // Speed Demon: freq≥80
  if (scores.frequency >= 80) {
    return { name: 'Speed Demon', emoji: '⚡', description: 'Rapid-fire trader. Moves fast and takes chances.' }
  }

  // Balanced Trader: moderate everything
  if (riskProfile.type === 'moderate' && scores.skill >= 40 && scores.skill <= 60) {
    return { name: 'Balanced Trader', emoji: '⚖️', description: 'Steady and measured. Neither too risky nor too safe.' }
  }

  // Default
  return { name: 'Rising Trader', emoji: '📈', description: 'Building experience. Every trade is a learning opportunity.' }
}

function computeTraitBadges(
  temporal: TemporalAnalysis,
  categoryPerformance: CategoryPerformance[],
  pnlAnalysis: PnlAnalysis,
  scores: PersonalityScores
): TraitBadge[] {
  const badges: TraitBadge[] = []

  // Streak badges
  if (temporal.currentStreak.type === 'win' && temporal.currentStreak.count >= 3) {
    badges.push({ emoji: '🔥', name: `${temporal.currentStreak.count}W Streak` })
  } else if (temporal.currentStreak.type === 'loss' && temporal.currentStreak.count >= 3) {
    badges.push({ emoji: '🥶', name: `${temporal.currentStreak.count}L Streak` })
  }

  // Trend badges
  if (temporal.trend === 'improving') {
    badges.push({ emoji: '📈', name: 'Improving' })
  } else if (temporal.trend === 'declining') {
    badges.push({ emoji: '📉', name: 'Declining' })
  }

  // Category expert
  const expertCat = categoryPerformance.find(c => c.winRate >= 65 && c.tradeCount >= 3)
  if (expertCat) {
    badges.push({ emoji: '🏆', name: `${expertCat.category} Expert` })
  }

  // High profit factor
  if (pnlAnalysis.profitFactor >= 1.5) {
    badges.push({ emoji: '💎', name: 'High Profit Factor' })
  }

  // Diversified
  if (scores.diversification >= 70) {
    badges.push({ emoji: '🌐', name: 'Diversified' })
  }

  return badges.slice(0, 4)
}

// ── Core unified analysis computation ──

async function computeAnalysis(
  trades: NormalizedTrade[],
  outcomes: NormalizedOutcome[]
): Promise<PersonalityAnalysis> {
  // 1. Category distribution (from outcomes' event_tickers)
  const categoryCount = new Map<string, number>()
  const eventTickers = new Set<string>()

  for (const o of outcomes) {
    if (o.event_ticker) eventTickers.add(o.event_ticker)
  }

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

  // 2. Risk profile (based on side-aware entry prices)
  let lowRiskCount = 0   // > 70c
  let midRiskCount = 0   // 30-70c
  let highRiskCount = 0  // < 30c
  let totalPrice = 0

  for (const trade of trades) {
    // yes_price is always the YES price; entry price depends on side
    const entryPrice = trade.side === 'yes' ? trade.yes_price : (100 - trade.yes_price)

    totalPrice += entryPrice

    if (entryPrice < 30) highRiskCount++
    else if (entryPrice > 70) lowRiskCount++
    else midRiskCount++
  }

  const avgEntryPrice = trades.length > 0 ? totalPrice / trades.length : 50
  let riskType: 'high_risk' | 'moderate' | 'conservative' = 'moderate'

  if (highRiskCount > lowRiskCount && highRiskCount > midRiskCount) {
    riskType = 'high_risk'
  } else if (lowRiskCount > highRiskCount && lowRiskCount > midRiskCount) {
    riskType = 'conservative'
  }

  // 3. Win rate (pnl-based: positive pnl = win)
  let wins = 0
  let losses = 0

  for (const o of outcomes) {
    if (o.isVoid) continue
    if (o.cost === 0 && o.revenue === 0) continue

    if (o.pnl > 0) wins++
    else losses++
  }

  const winPercentage = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  // 4. ROI (total revenue vs total cost)
  let totalRevenue = 0
  let totalCost = 0

  for (const o of outcomes) {
    totalRevenue += o.revenue
    totalCost += o.cost
  }

  const roiPercentage = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0

  // 5. Trading frequency
  const tradeDates = new Set<string>()
  for (const trade of trades) {
    if (trade.created_time) {
      const date = trade.created_time.split('T')[0] ?? trade.created_time
      tradeDates.add(date)
    }
  }

  const activeDays = tradeDates.size || 1
  const tradesPerDay = Math.round((trades.length / activeDays) * 10) / 10

  // 6. Category Performance
  // Build event_ticker → category map from outcomes
  const tickerCategoryMap = new Map<string, string>()
  for (const o of outcomes) {
    if (o.event_ticker && !tickerCategoryMap.has(o.event_ticker)) {
      const cat = categoryCache.get(o.event_ticker)
      if (cat) tickerCategoryMap.set(o.event_ticker, cat)
    }
  }

  const catPerfMap = new Map<string, { wins: number; losses: number; totalPnl: number; totalCost: number; count: number }>()
  for (const o of outcomes) {
    if (o.isVoid || (o.cost === 0 && o.revenue === 0)) continue
    const cat = tickerCategoryMap.get(o.event_ticker) || 'Unknown'
    const entry = catPerfMap.get(cat) || { wins: 0, losses: 0, totalPnl: 0, totalCost: 0, count: 0 }
    entry.count++
    entry.totalPnl += o.pnl
    entry.totalCost += o.cost
    if (o.pnl > 0) entry.wins++
    else entry.losses++
    catPerfMap.set(cat, entry)
  }

  const categoryPerformance: CategoryPerformance[] = Array.from(catPerfMap.entries())
    .map(([category, s]) => ({
      category,
      wins: s.wins,
      losses: s.losses,
      winRate: (s.wins + s.losses) > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0,
      totalPnl: s.totalPnl,
      avgPnl: s.count > 0 ? Math.round(s.totalPnl / s.count) : 0,
      roi: s.totalCost > 0 ? Math.round((s.totalPnl / s.totalCost) * 100) : 0,
      tradeCount: s.count,
    }))
    .sort((a, b) => b.totalPnl - a.totalPnl)

  // 7. PnL Analysis (Profit Factor)
  let totalWinnings = 0
  let totalLosses = 0
  let winCount = 0
  let lossCount = 0
  let biggestWin = 0
  let biggestLoss = 0

  for (const o of outcomes) {
    if (o.isVoid || (o.cost === 0 && o.revenue === 0)) continue
    if (o.pnl > 0) {
      totalWinnings += o.pnl
      winCount++
      if (o.pnl > biggestWin) biggestWin = o.pnl
    } else if (o.pnl < 0) {
      totalLosses += Math.abs(o.pnl)
      lossCount++
      if (Math.abs(o.pnl) > biggestLoss) biggestLoss = Math.abs(o.pnl)
    }
  }

  const avgWinSize = winCount > 0 ? Math.round(totalWinnings / winCount) : 0
  const avgLossSize = lossCount > 0 ? Math.round(totalLosses / lossCount) : 0
  const profitFactor = totalLosses > 0 ? Math.round((totalWinnings / totalLosses) * 100) / 100 : totalWinnings > 0 ? 99.0 : 0
  const totalOutcomes = winCount + lossCount
  const wr = totalOutcomes > 0 ? winCount / totalOutcomes : 0
  const lr = totalOutcomes > 0 ? lossCount / totalOutcomes : 0
  const expectancy = Math.round((wr * avgWinSize) - (lr * avgLossSize))

  const pnlAnalysis: PnlAnalysis = {
    avgWinSize,
    avgLossSize,
    profitFactor,
    biggestWin,
    biggestLoss,
    expectancy,
  }

  // 8. Temporal Analysis
  // Build ticker → earliest trade time map for sorting outcomes
  const tickerTimeMap = new Map<string, string>()
  for (const t of trades) {
    if (t.created_time) {
      const existing = tickerTimeMap.get(t.ticker)
      if (!existing || t.created_time < existing) {
        tickerTimeMap.set(t.ticker, t.created_time)
      }
    }
  }

  // Sort outcomes by time
  const validOutcomes = outcomes.filter(o => !o.isVoid && (o.cost !== 0 || o.revenue !== 0))
  const sortedOutcomes = [...validOutcomes].sort((a, b) => {
    const ta = tickerTimeMap.get(a.ticker) || ''
    const tb = tickerTimeMap.get(b.ticker) || ''
    return ta.localeCompare(tb)
  })

  const splitIdx = Math.floor(sortedOutcomes.length * 0.75)
  const historicalOutcomes = sortedOutcomes.slice(0, splitIdx)
  const recentOutcomes = sortedOutcomes.slice(splitIdx)

  const calcWinRate = (arr: NormalizedOutcome[]) => {
    const w = arr.filter(o => o.pnl > 0).length
    return arr.length > 0 ? Math.round((w / arr.length) * 100) : 0
  }
  const calcRoi = (arr: NormalizedOutcome[]) => {
    const c = arr.reduce((s, o) => s + o.cost, 0)
    const r = arr.reduce((s, o) => s + o.revenue, 0)
    return c > 0 ? Math.round(((r - c) / c) * 100) : 0
  }

  const recentWinRate = calcWinRate(recentOutcomes)
  const historicalWinRate = calcWinRate(historicalOutcomes)
  const recentRoi = calcRoi(recentOutcomes)
  const historicalRoi = calcRoi(historicalOutcomes)

  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
  if (recentWinRate - historicalWinRate > 10) trendDirection = 'improving'
  else if (recentWinRate - historicalWinRate < -10) trendDirection = 'declining'

  // Streak calculation
  let currentStreakType: 'win' | 'loss' = 'win'
  let currentStreakCount = 0
  let longestWinStreak = 0
  let longestLossStreak = 0
  let tempWinStreak = 0
  let tempLossStreak = 0

  for (const o of sortedOutcomes) {
    if (o.pnl > 0) {
      tempWinStreak++
      tempLossStreak = 0
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak
    } else {
      tempLossStreak++
      tempWinStreak = 0
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak
    }
  }
  // Current streak = last run
  if (sortedOutcomes.length > 0) {
    const last = sortedOutcomes[sortedOutcomes.length - 1]!
    currentStreakType = last.pnl > 0 ? 'win' : 'loss'
    currentStreakCount = 1
    for (let i = sortedOutcomes.length - 2; i >= 0; i--) {
      const item = sortedOutcomes[i]!
      const isWin = item.pnl > 0
      if ((isWin && currentStreakType === 'win') || (!isWin && currentStreakType === 'loss')) {
        currentStreakCount++
      } else {
        break
      }
    }
  }

  const temporal: TemporalAnalysis = {
    recentWinRate,
    historicalWinRate,
    recentRoi,
    historicalRoi,
    trend: trendDirection,
    currentStreak: { type: currentStreakType, count: currentStreakCount },
    longestWinStreak,
    longestLossStreak,
  }

  // 9. Side Bias
  let yesBuyCount = 0
  let noBuyCount = 0
  for (const t of trades) {
    if (t.action === 'buy') {
      if (t.side === 'yes') yesBuyCount++
      else noBuyCount++
    }
  }
  const totalBuys = yesBuyCount + noBuyCount
  const yesBuyPercentage = totalBuys > 0 ? Math.round((yesBuyCount / totalBuys) * 100) : 50
  let bias: SideBias['bias'] = 'balanced'
  if (yesBuyPercentage > 65) bias = 'yes_heavy'
  else if (yesBuyPercentage < 35) bias = 'no_heavy'

  const sideBias: SideBias = { yesBuyCount, noBuyCount, yesBuyPercentage, bias }

  // 10. Personality Scores + Enhanced Tags + Traits
  const riskAppetite = totalBuys > 0
    ? Math.round(((highRiskCount - lowRiskCount) / (highRiskCount + midRiskCount + lowRiskCount || 1)) * 100)
    : 0

  // Shannon entropy for diversification
  const catValues = categories.map(c => c.percentage / 100).filter(v => v > 0)
  const maxEntropy = catValues.length > 1 ? Math.log2(catValues.length) : 1
  const entropy = catValues.length > 0
    ? -catValues.reduce((s, p) => s + p * Math.log2(p), 0)
    : 0
  const diversification = maxEntropy > 0 ? Math.round((entropy / maxEntropy) * 100) : 0

  const frequencyScore = Math.min(100, Math.round((tradesPerDay / 5) * 100))

  const profitFactorScore = Math.min(100, Math.round(profitFactor * 33)) // 3.0 → 100
  const skillScore = Math.round(winPercentage * 0.4 + profitFactorScore * 0.6)

  const trendScore = recentWinRate - historicalWinRate // -100 ~ +100

  // Conviction: avg trades per unique market
  const uniqueMarkets = new Set(trades.map(t => t.ticker)).size
  const avgTradesPerMarket = uniqueMarkets > 0 ? trades.length / uniqueMarkets : 1
  const convictionScore = Math.min(100, Math.round(avgTradesPerMarket * 25)) // 4 trades/market → 100

  const scores: PersonalityScores = {
    riskAppetite,
    diversification,
    frequency: frequencyScore,
    skill: skillScore,
    trend: trendScore,
    conviction: convictionScore,
  }

  const tag = determineEnhancedTag(scores, { type: riskType, avgEntryPrice: Math.round(avgEntryPrice), lowRiskCount, midRiskCount, highRiskCount }, categories, categoryPerformance, pnlAnalysis)
  const traits = computeTraitBadges(temporal, categoryPerformance, pnlAnalysis, scores)

  // Build analysis
  return {
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
      totalTrades: trades.length,
      activeDays,
      tradesPerDay
    },
    tag,
    categoryPerformance,
    pnlAnalysis,
    temporal,
    sideBias,
    traits,
    scores,
  }
}

// ── Authenticated API path ──

export async function analyzePersonality(credentials: KalshiCredentials): Promise<PersonalityAnalysis> {
  const [fillsData, settlementsData] = await Promise.all([
    getFills(credentials),
    getSettlements(credentials)
  ])

  // Convert fills → NormalizedTrade
  const trades: NormalizedTrade[] = fillsData.fills.map(f => ({
    ticker: f.ticker,
    side: f.side,
    action: f.action,
    yes_price: f.yes_price,
    created_time: f.created_time,
  }))

  // Convert settlements → NormalizedOutcome
  const outcomes: NormalizedOutcome[] = settlementsData.settlements.map(s => {
    const cost = s.yes_total_cost + s.no_total_cost
    return {
      ticker: s.ticker,
      event_ticker: s.event_ticker,
      isVoid: s.market_result === 'void',
      pnl: s.revenue - cost,
      cost,
      revenue: s.revenue,
    }
  })

  return computeAnalysis(trades, outcomes)
}

// ── Social API path (same computation, different data source) ──

export async function analyzeFromSocial(nickname: string): Promise<PersonalityAnalysis> {
  const [socialTrades, closedHoldings] = await Promise.all([
    getSocialTrades(nickname),
    getSocialHoldings(nickname, true),
  ])

  // Convert social trades → NormalizedTrade (with side-aware yes_price)
  const trades: NormalizedTrade[] = socialTrades.map(t => ({
    ticker: t.ticker,
    side: t.taker_side,
    action: t.taker_action,
    // Social API gives the price the taker paid for their side.
    // Convert to yes_price: if taker bought YES at 65c, yes_price=65.
    // If taker bought NO at 40c, yes_price = 100 - 40 = 60.
    yes_price: t.taker_side === 'yes' ? t.price : (100 - t.price),
    created_time: t.create_date,
  }))

  // Build cost estimates per ticker from buy trades
  const costByTicker = new Map<string, number>()
  for (const t of socialTrades) {
    if (t.taker_action === 'buy') {
      const cost = t.price * t.count
      costByTicker.set(t.ticker, (costByTicker.get(t.ticker) || 0) + cost)
    }
  }

  // Convert closed holdings → NormalizedOutcome
  const outcomes: NormalizedOutcome[] = []
  for (const holding of closedHoldings) {
    for (const mh of holding.market_holdings) {
      const estimatedCost = costByTicker.get(mh.market_ticker) || Math.abs(mh.pnl)
      outcomes.push({
        ticker: mh.market_ticker,
        event_ticker: holding.event_ticker,
        isVoid: false,
        pnl: mh.pnl,
        cost: estimatedCost,
        revenue: estimatedCost + mh.pnl,
      })
    }
  }

  return computeAnalysis(trades, outcomes)
}

// ── Recommendations (uses authenticated API) ──

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

    // 3. Category match with categoryPerformance-based weighting (35 pts)
    let marketCategory = 'Unknown'
    try {
      marketCategory = await getMarketCategory(market.event_ticker)

      // Use categoryPerformance if available for precise win rate data
      const catPerf = analysis.categoryPerformance?.find(
        cp => cp.category.toLowerCase() === marketCategory.toLowerCase()
      )

      if (catPerf) {
        if (catPerf.winRate > 60) {
          score += 35
          reasons.push(`${catPerf.winRate}% win rate in ${marketCategory}`)
        } else if (catPerf.winRate > 0) {
          score += 20
          reasons.push(`Active in ${marketCategory} (${catPerf.winRate}% WR)`)
        } else {
          score += 10
          reasons.push(`Traded in ${marketCategory}`)
        }
      } else {
        // Fallback to old category matching
        const topCategories = analysis.categories.slice(0, 3).map(c => c.name.toLowerCase())
        if (topCategories.some(tc => marketCategory.toLowerCase().includes(tc))) {
          const catStats = categoryStats.get(marketCategory)
          const catWr = catStats && catStats.total > 0 ? catStats.wins / catStats.total : 0
          if (catWr > 0.6) {
            score += 35
            reasons.push(`${Math.round(catWr * 100)}% win rate in ${marketCategory}`)
          } else if (catWr > 0) {
            score += 20
            reasons.push(`Active in ${marketCategory}`)
          } else {
            score += 15
            reasons.push(`Favorite sector: ${marketCategory}`)
          }
        }
      }
    } catch {
      // Skip
    }

    // 4. Trend bonus (+10 pts)
    if (analysis.temporal?.trend === 'improving') {
      score += 10
      reasons.push('Trader on upswing')
    }

    // 5. Contrarian bonus for NO-heavy traders (+10 pts)
    if (analysis.sideBias?.bias === 'no_heavy' && midPrice > 60) {
      score += 10
      reasons.push('Contrarian play')
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
