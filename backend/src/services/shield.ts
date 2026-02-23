import type { KalshiCredentials, PortfolioRisk, PositionData, RiskAlert, OrderbookAnalysis, HedgeCalculation } from '../types'
import { getPositions, getMarket, getOrderbook, getBalance, getEvent } from './kalshi'

// Cache for event data
const eventCache = new Map<string, { category: string; title: string }>()

async function getEventInfo(eventTicker: string): Promise<{ category: string; title: string }> {
  if (eventCache.has(eventTicker)) return eventCache.get(eventTicker)!
  try {
    const data = await getEvent(eventTicker)
    const info = { category: data.event.category || 'Unknown', title: data.event.title }
    eventCache.set(eventTicker, info)
    return info
  } catch {
    return { category: 'Unknown', title: eventTicker }
  }
}

export async function analyzePortfolioRisk(credentials: KalshiCredentials): Promise<PortfolioRisk> {
  const positionsData = await getPositions(credentials)
  const positions: PositionData[] = []

  let totalExposure = 0
  let totalUnrealizedPnl = 0
  const categoryMap = new Map<string, { count: number; exposure: number }>()
  let yesCount = 0
  let noCount = 0

  for (const pos of positionsData.market_positions) {
    if (pos.position === 0) continue

    let marketData: { market: { event_ticker: string; title: string; yes_bid: number; yes_ask: number; no_bid: number; no_ask: number } }
    try {
      marketData = await getMarket(pos.ticker)
    } catch {
      continue
    }

    const market = marketData.market
    const side: 'yes' | 'no' = pos.position > 0 ? 'yes' : 'no'
    const quantity = Math.abs(pos.position)

    // Current mid price for the side
    const currentPrice = side === 'yes'
      ? Math.round((market.yes_bid + market.yes_ask) / 2)
      : Math.round((market.no_bid + market.no_ask) / 2)

    // Exposure = quantity * current price (in cents)
    const exposure = quantity * currentPrice
    totalExposure += exposure

    // Get category
    const eventInfo = await getEventInfo(market.event_ticker)

    // Unrealized PnL (approximate)
    const unrealizedPnl = pos.realized_pnl || 0
    totalUnrealizedPnl += unrealizedPnl

    positions.push({
      ticker: pos.ticker,
      eventTicker: market.event_ticker,
      title: market.title || pos.ticker,
      side,
      quantity,
      avgPrice: Math.round(pos.total_traded > 0 ? (pos.market_exposure / pos.total_traded) * 100 : currentPrice),
      currentPrice,
      marketExposure: exposure,
      unrealizedPnl,
      category: eventInfo.category,
    })

    // Category tracking
    const existing = categoryMap.get(eventInfo.category)
    if (existing) {
      existing.count++
      existing.exposure += exposure
    } else {
      categoryMap.set(eventInfo.category, { count: 1, exposure })
    }

    // Direction tracking
    if (side === 'yes') yesCount++
    else noCount++
  }

  // Category breakdown
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      percentage: totalExposure > 0 ? Math.round((data.exposure / totalExposure) * 100) : 0,
      exposure: data.exposure,
    }))
    .sort((a, b) => b.exposure - a.exposure)

  // Direction bias
  const totalPositions = yesCount + noCount
  const directionBias = {
    yes: totalPositions > 0 ? Math.round((yesCount / totalPositions) * 100) : 50,
    no: totalPositions > 0 ? Math.round((noCount / totalPositions) * 100) : 50,
  }

  // Risk alerts
  const alerts: RiskAlert[] = []

  // Concentration risk
  const topCategory = categoryBreakdown[0]
  if (topCategory && topCategory.percentage > 50) {
    alerts.push({
      type: 'concentration',
      severity: topCategory.percentage > 75 ? 'critical' : 'warning',
      message: `High concentration in ${topCategory.name}`,
      detail: `${topCategory.percentage}% of exposure in a single category`,
    })
  }

  // Directional bias
  if (directionBias.yes > 80 || directionBias.no > 80) {
    alerts.push({
      type: 'directional_bias',
      severity: 'warning',
      message: `Strong ${directionBias.yes > 80 ? 'YES' : 'NO'} bias`,
      detail: `${Math.max(directionBias.yes, directionBias.no)}% of positions on one side`,
    })
  }

  // High exposure
  const balanceData = await getBalance(credentials)
  const balanceInCents = balanceData.balance / 100 // balance is in centi-cents
  if (totalExposure > balanceInCents * 0.8) {
    alerts.push({
      type: 'high_exposure',
      severity: 'critical',
      message: 'High portfolio exposure',
      detail: `Exposure is ${Math.round((totalExposure / balanceInCents) * 100)}% of available balance`,
    })
  }

  return {
    positions,
    totalExposure,
    totalUnrealizedPnl,
    categoryBreakdown,
    directionBias,
    alerts,
  }
}

export async function analyzeOrderbook(ticker: string): Promise<OrderbookAnalysis> {
  const data = await getOrderbook(ticker)
  const orderbook = data.orderbook

  // Parse bids: [price, quantity]
  const yesBids = (orderbook.yes || []).map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => b.price - a.price)  // best (highest) first

  const noBids = (orderbook.no || []).map(([price, quantity]) => ({ price, quantity }))
    .sort((a, b) => b.price - a.price)

  // Best prices
  const bestYesBid = yesBids[0]?.price ?? 0
  const bestNoBid = noBids[0]?.price ?? 0

  // Kalshi: YES_Ask = 100 - Best_NO_Bid, NO_Ask = 100 - Best_YES_Bid
  const bestYesAsk = bestNoBid > 0 ? 100 - bestNoBid : 0
  const bestNoAsk = bestYesBid > 0 ? 100 - bestYesBid : 0

  const spread = bestYesAsk > 0 && bestYesBid > 0 ? bestYesAsk - bestYesBid : 0

  return {
    ticker,
    bestYesBid,
    bestYesAsk,
    bestNoBid,
    bestNoAsk,
    spread,
    yesBids,
    noBids,
  }
}

export function calculateHedge(
  orderbookAnalysis: OrderbookAnalysis,
  hedgeSide: 'yes' | 'no',
  defenseAmount: number  // in cents
): HedgeCalculation {
  // Determine which bids to fill against
  // To buy YES, we lift NO asks (= 100 - NO bids), or we can place YES bids
  // To buy NO, we lift YES asks (= 100 - YES bids), or we can place NO bids

  // For limit order: use the ask price for the side we want to buy
  const askPrice = hedgeSide === 'yes'
    ? orderbookAnalysis.bestYesAsk
    : orderbookAnalysis.bestNoAsk

  if (askPrice <= 0) {
    return {
      ticker: orderbookAnalysis.ticker,
      hedgeSide,
      contractsNeeded: 0,
      pricePerContract: 0,
      totalCost: 0,
      effectiveAvgPrice: 0,
      slippage: 0,
      potentialPayout: 0,
      defenseAmount,
      costAsPercentage: 0,
    }
  }

  // Profit per contract = 100 (payout) - ask price
  const profitPerContract = 100 - askPrice

  // Contracts needed = defense amount / profit per contract
  const contractsNeeded = Math.ceil(defenseAmount / profitPerContract)
  const totalCost = contractsNeeded * askPrice

  // Calculate slippage by walking the orderbook
  const oppositeBooks = hedgeSide === 'yes'
    ? orderbookAnalysis.noBids  // to buy YES, we consume NO bids
    : orderbookAnalysis.yesBids // to buy NO, we consume YES bids

  let filled = 0
  let totalPriceWeight = 0
  for (const level of oppositeBooks) {
    const fillable = Math.min(level.quantity, contractsNeeded - filled)
    const effectivePrice = 100 - level.price  // convert to our side's price
    totalPriceWeight += effectivePrice * fillable
    filled += fillable
    if (filled >= contractsNeeded) break
  }

  const effectiveAvgPrice = filled > 0 ? Math.round(totalPriceWeight / filled) : askPrice
  const slippage = askPrice > 0 ? Math.round(((effectiveAvgPrice - askPrice) / askPrice) * 10000) / 100 : 0

  const potentialPayout = contractsNeeded * 100  // max payout if event resolves in our favor

  return {
    ticker: orderbookAnalysis.ticker,
    hedgeSide,
    contractsNeeded,
    pricePerContract: askPrice,
    totalCost,
    effectiveAvgPrice,
    slippage: Math.max(0, slippage),
    potentialPayout,
    defenseAmount,
    costAsPercentage: defenseAmount > 0 ? Math.round((totalCost / defenseAmount) * 10000) / 100 : 0,
  }
}
