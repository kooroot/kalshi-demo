import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  getPortfolioRisk, getBalance, calculateHedge, executeHedge,
  type PortfolioRisk, type PositionData, type HedgeCalculation, type OrderbookAnalysis, type BalanceData
} from '@/lib/api'

export function DashboardPage() {
  const { profileId } = useParams({ from: '/dashboard/$profileId' })
  const navigate = useNavigate()

  const portfolioQuery = useQuery({
    queryKey: ['portfolio', profileId],
    queryFn: () => getPortfolioRisk(profileId),
  })

  const balanceQuery = useQuery({
    queryKey: ['balance', profileId],
    queryFn: () => getBalance(profileId),
  })

  if (portfolioQuery.error?.message?.includes('reconnect')) {
    return (
      <div className="min-h-screen bg-terminal grid-bg flex items-center justify-center">
        <div className="terminal-glass-panel p-12 text-center space-y-6 rounded-lg max-w-md">
          <div className="text-terminal-yellow text-4xl">⚠</div>
          <div className="text-xl font-bold uppercase tracking-widest">Session Expired</div>
          <Button onClick={() => navigate({ to: '/' })} className="w-full bg-terminal-yellow/10 hover:bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/50">
            Reconnect
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal grid-bg text-terminal-text selection:bg-terminal-green/30">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-terminal-bg/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#d29922]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <span className="text-terminal-green text-xs font-bold tracking-[0.2em] cursor-default">KALSHI<span className="text-white/30">_OS</span></span>
        </div>

        <div className="flex items-center gap-4">
          {/* High-tech Nav tabs */}
          <nav className="flex items-center bg-black/60 rounded border border-terminal-border p-1 shadow-inner relative overflow-hidden">
            <div className="absolute left-1/2 top-1 bottom-1 w-[1px] bg-terminal-border/50 z-0" />
            <Link to="/profile/$profileId" params={{ profileId }} className="relative z-10 flex-1 min-w-[130px] flex flex-col items-center justify-center py-1.5 text-[10px] sm:text-xs tracking-widest uppercase font-bold text-terminal-muted hover:text-terminal-green transition-colors hover:bg-terminal-green/5 rounded-sm">
              <span className="text-[8px] text-terminal-dim tracking-wider mb-0.5 leading-none">STANDBY</span>
              <span className="leading-none">SCOUT</span>
            </Link>
            <div className="relative z-10 flex-1 min-w-[130px] flex flex-col items-center justify-center py-1.5 text-[10px] sm:text-xs tracking-widest uppercase font-black text-black bg-terminal-cyan scale-100 rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              <span className="text-[8px] font-bold text-black/60 tracking-wider mb-0.5 leading-none">ACTIVE_MODE</span>
              <span className="leading-none">SHIELD</span>
            </div>
          </nav>

          <div className="flex items-center gap-3 text-[10px] font-mono">
            {balanceQuery.data && (
              <span className="text-terminal-green font-bold">${balanceQuery.data.balanceDollars}</span>
            )}
            <Badge variant="outline" className="border-terminal-cyan/50 bg-terminal-cyan/5 text-terminal-cyan text-[9px] px-2 py-0.5">
              SHIELD_MODE
            </Badge>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4 md:px-6 max-w-7xl mx-auto">

        {/* Risk Alerts */}
        {portfolioQuery.data?.alerts && portfolioQuery.data.alerts.length > 0 && (
          <div className="mb-6 space-y-2 opacity-0 animate-fade-in-up">
            {portfolioQuery.data.alerts.map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-center gap-3 text-xs font-mono ${alert.severity === 'critical'
                  ? 'bg-terminal-red/5 border-terminal-red/30 text-terminal-red'
                  : 'bg-terminal-yellow/5 border-terminal-yellow/30 text-terminal-yellow'
                  }`}
              >
                <span className="text-lg">{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
                <div>
                  <div className="font-bold uppercase tracking-wider">{alert.message}</div>
                  <div className="opacity-70">{alert.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {portfolioQuery.isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="terminal-glass-panel p-12 text-center rounded-lg">
              <div className="text-terminal-cyan text-2xl mb-4 font-bold tracking-widest animate-pulse">SCANNING_POSITIONS</div>
              <div className="text-terminal-muted text-xs tracking-widest uppercase">Analyzing portfolio exposure...</div>
            </div>
          </div>
        ) : portfolioQuery.error ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="terminal-glass-panel p-12 text-center rounded-lg">
              <div className="text-terminal-red text-xl mb-2">✗ ERROR</div>
              <div className="text-terminal-muted text-sm">{portfolioQuery.error.message}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 opacity-0 animate-fade-in-up">
            {/* Portfolio Overview */}
            <PortfolioOverview
              risk={portfolioQuery.data!}
              balance={balanceQuery.data}
            />

            {/* Positions + Hedge Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <PositionsPanel
                  positions={portfolioQuery.data!.positions}
                  profileId={profileId}
                />
              </div>
              <div className="lg:col-span-2 space-y-6">
                <RiskBreakdown risk={portfolioQuery.data!} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function PortfolioOverview({ risk, balance }: { risk: PortfolioRisk; balance?: BalanceData }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <OverviewStat
        label="TOTAL EXPOSURE"
        value={`$${(risk.totalExposure / 100).toFixed(2)}`}
        color="cyan"
      />
      <OverviewStat
        label="POSITIONS"
        value={risk.positions.length.toString()}
        color="blue"
      />
      <OverviewStat
        label="DIRECTION BIAS"
        value={`${risk.directionBias.yes}% YES`}
        color={risk.directionBias.yes > 70 ? 'yellow' : 'green'}
      />
      <OverviewStat
        label="AVAILABLE"
        value={balance ? `$${balance.balanceDollars}` : '...'}
        color="green"
      />
    </div>
  )
}

function OverviewStat({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'text-terminal-green border-terminal-green/20',
    red: 'text-terminal-red border-terminal-red/20',
    cyan: 'text-terminal-cyan border-terminal-cyan/20',
    blue: 'text-terminal-blue border-terminal-blue/20',
    yellow: 'text-terminal-yellow border-terminal-yellow/20',
  }

  return (
    <div className={`terminal-glass-panel p-4 rounded-lg border ${colors[color] || ''}`}>
      <div className="text-terminal-dim text-[9px] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-black font-mono ${colors[color]?.split(' ')[0] || ''}`}>{value}</div>
    </div>
  )
}

function PositionsPanel({ positions, profileId }: { positions: PositionData[]; profileId: string }) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [hedgeAmount, setHedgeAmount] = useState('')
  const [hedgeResult, setHedgeResult] = useState<{ calculation: HedgeCalculation; orderbook: OrderbookAnalysis } | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const selectedPosition = positions.find(p => p.ticker === selectedTicker)

  const handleCalculateHedge = async () => {
    if (!selectedPosition || !hedgeAmount) return
    setIsCalculating(true)
    setHedgeResult(null)
    try {
      // Hedge = opposite side of current position
      const hedgeSide = selectedPosition.side === 'yes' ? 'no' : 'yes'
      const result = await calculateHedge(selectedPosition.ticker, hedgeSide as 'yes' | 'no', parseInt(hedgeAmount))
      setHedgeResult(result)
    } catch (err) {
      console.error('Hedge calc error:', err)
    } finally {
      setIsCalculating(false)
    }
  }

  const executeMutation = useMutation({
    mutationFn: (params: { ticker: string; side: 'yes' | 'no'; count: number; price: number }) =>
      executeHedge(profileId, params),
    onSuccess: (data) => {
      setOrderStatus(`Order ${data.order.orderId.slice(0, 8)}... placed! Status: ${data.order.status}`)
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: (err: Error) => {
      setOrderStatus(`Failed: ${err.message}`)
    },
  })

  const handleExecute = () => {
    if (!hedgeResult || !selectedPosition) return
    const calc = hedgeResult.calculation
    executeMutation.mutate({
      ticker: calc.ticker,
      side: calc.hedgeSide,
      count: calc.contractsNeeded,
      price: calc.pricePerContract,
    })
  }

  if (positions.length === 0) {
    return (
      <div className="terminal-glass-panel p-8 rounded-xl text-center">
        <div className="text-terminal-dim text-sm font-mono mb-2">No open positions detected</div>
        <div className="text-terminal-muted text-xs">Trade on Kalshi to see positions here</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 bg-terminal-cyan rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
        <div>
          <h2 className="text-lg font-bold tracking-wider text-white">ACTIVE_POSITIONS</h2>
          <div className="text-[10px] text-terminal-muted font-mono uppercase tracking-widest">Select position to hedge</div>
        </div>
      </div>

      {/* Positions list */}
      <div className="space-y-2">
        {positions.map((pos) => (
          <div
            key={pos.ticker}
            onClick={() => { setSelectedTicker(pos.ticker); setHedgeResult(null); setOrderStatus(null) }}
            className={`terminal-glass-panel p-4 rounded-lg cursor-pointer transition-all hover:border-terminal-cyan/50 ${selectedTicker === pos.ticker ? 'border-terminal-cyan/50 bg-terminal-cyan/5' : 'border-white/5'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[9px] ${pos.side === 'yes' ? 'border-terminal-green/50 text-terminal-green' : 'border-terminal-red/50 text-terminal-red'}`}>
                    {pos.side.toUpperCase()} × {pos.quantity}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] border-white/10 text-terminal-muted">
                    {pos.category}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-terminal-text truncate">{pos.title}</div>
                <div className="text-[10px] text-terminal-dim font-mono mt-0.5">{pos.ticker}</div>
              </div>
              <div className="text-right pl-4">
                <div className="text-sm font-mono font-bold text-terminal-text">{pos.currentPrice}¢</div>
                <div className={`text-[10px] font-mono ${pos.unrealizedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                  {pos.unrealizedPnl >= 0 ? '+' : ''}{(pos.unrealizedPnl / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hedge Calculator */}
      {selectedPosition && (
        <div className="terminal-glass-panel p-6 rounded-xl border-terminal-cyan/20 space-y-4 opacity-0 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="text-terminal-cyan text-xs">⛊</span>
            <span className="text-terminal-muted text-xs uppercase tracking-widest font-bold">Hedging_Calculator</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-terminal-dim">Position:</span>
              <div className="font-mono text-terminal-text">{selectedPosition.side.toUpperCase()} × {selectedPosition.quantity}</div>
            </div>
            <div>
              <span className="text-terminal-dim">Hedge Side:</span>
              <div className={`font-mono ${selectedPosition.side === 'yes' ? 'text-terminal-red' : 'text-terminal-green'}`}>
                {selectedPosition.side === 'yes' ? 'NO' : 'YES'} (opposite)
              </div>
            </div>
          </div>

          <Separator className="bg-white/5" />

          <div>
            <label className="text-[10px] text-terminal-dim uppercase tracking-wider block mb-1">Defense Target (cents)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={hedgeAmount}
                onChange={(e) => setHedgeAmount(e.target.value)}
                placeholder="e.g. 1500"
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono text-terminal-text placeholder:text-terminal-dim focus:border-terminal-cyan/50 focus:outline-none"
              />
              <Button
                onClick={handleCalculateHedge}
                disabled={!hedgeAmount || isCalculating}
                className="bg-terminal-cyan/10 hover:bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/30 text-xs uppercase tracking-wider font-bold"
              >
                {isCalculating ? '...' : 'Calculate'}
              </Button>
            </div>
          </div>

          {/* Hedge Result */}
          {hedgeResult && (
            <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-black/30 rounded-lg p-4 border border-terminal-cyan/10 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <HedgeStat label="Contracts Needed" value={hedgeResult.calculation.contractsNeeded.toString()} />
                  <HedgeStat label="Price/Contract" value={`${hedgeResult.calculation.pricePerContract}¢`} />
                  <HedgeStat label="Total Cost" value={`$${(hedgeResult.calculation.totalCost / 100).toFixed(2)}`} />
                  <HedgeStat label="Slippage" value={`${hedgeResult.calculation.slippage}%`} />
                  <HedgeStat label="Max Payout" value={`$${(hedgeResult.calculation.potentialPayout / 100).toFixed(2)}`} />
                  <HedgeStat label="Cost / Defense" value={`${hedgeResult.calculation.costAsPercentage}%`} />
                </div>

                {/* Orderbook info */}
                <Separator className="bg-white/5" />
                <div className="flex justify-between text-[10px] text-terminal-dim">
                  <span>Spread: {hedgeResult.orderbook.spread}¢</span>
                  <span>Best Bid: {hedgeResult.orderbook.bestYesBid}¢ / Ask: {hedgeResult.orderbook.bestYesAsk}¢</span>
                </div>
              </div>

              <Button
                onClick={handleExecute}
                disabled={executeMutation.isPending || hedgeResult.calculation.contractsNeeded === 0}
                className="w-full h-12 bg-terminal-green/10 hover:bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:border-terminal-green/60 text-sm uppercase tracking-widest font-bold transition-all"
              >
                {executeMutation.isPending ? 'EXECUTING...' : `⛊ EXECUTE HEDGE — $${(hedgeResult.calculation.totalCost / 100).toFixed(2)}`}
              </Button>

              {orderStatus && (
                <div className={`text-xs font-mono p-3 rounded border ${orderStatus.startsWith('Failed') ? 'bg-terminal-red/5 border-terminal-red/20 text-terminal-red' : 'bg-terminal-green/5 border-terminal-green/20 text-terminal-green'
                  }`}>
                  {orderStatus}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HedgeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-terminal-dim text-[9px] uppercase tracking-wider">{label}</div>
      <div className="text-terminal-text font-mono font-bold">{value}</div>
    </div>
  )
}

function RiskBreakdown({ risk }: { risk: PortfolioRisk }) {
  return (
    <div className="space-y-4">
      {/* Risk Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-8 bg-terminal-cyan rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
        <div>
          <h2 className="text-lg font-bold tracking-wider text-white flex items-center gap-2">
            RISK_ANALYSIS
          </h2>
          <div className="text-[10px] text-terminal-muted font-mono uppercase tracking-widest">Portfolio Exposure & Bias</div>
        </div>
      </div>

      <div className="space-y-4 opacity-0 animate-fade-in-up stagger-2">
        {/* Category Concentration */}
        <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-orange/40 transition-all shadow-lg hover:shadow-terminal-orange/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-orange/5 rounded-full blur-3xl group-hover:bg-terminal-orange/10 transition-all duration-700 pointer-events-none" />

          <div className="flex items-center gap-2 mb-6">
            <span className="text-terminal-orange text-xs animate-pulse">●</span>
            <span className="text-white text-xs uppercase tracking-widest font-bold">Sector_Exposure</span>
          </div>

          {risk.categoryBreakdown.length === 0 ? (
            <div className="text-terminal-dim text-sm italic">No positions to analyze</div>
          ) : (
            <div className="space-y-5">
              {risk.categoryBreakdown.map((cat, i) => {
                const colors = ['bg-terminal-cyan', 'bg-terminal-blue', 'bg-terminal-purple', 'bg-terminal-orange', 'bg-terminal-green']
                const colorHex = ['rgba(0,240,255', 'rgba(59,130,246', 'rgba(168,85,247', 'rgba(249,115,22', 'rgba(16,185,129']
                return (
                  <div key={i} className="space-y-2 group/bar">
                    <div className="flex justify-between text-[11px] items-end">
                      <span className="text-terminal-text group-hover/bar:text-white transition-colors">{cat.name}</span>
                      <div className="text-right">
                        <div className="font-mono text-terminal-muted text-[10px] group-hover/bar:text-terminal-text transition-colors">
                          {cat.percentage}% · ${(cat.exposure / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-1000 group-hover/bar:brightness-125`}
                        style={{
                          width: `${cat.percentage}%`,
                          boxShadow: `0 0 10px ${colorHex[i % colorHex.length]}, 0.5)`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Direction Bias */}
        <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-purple/40 transition-all shadow-lg hover:shadow-terminal-purple/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-purple/5 rounded-full blur-3xl group-hover:bg-terminal-purple/10 transition-all duration-700 pointer-events-none" />

          <div className="flex items-center gap-2 mb-6">
            <span className="text-terminal-purple text-xs animate-pulse">●</span>
            <span className="text-white text-xs uppercase tracking-widest font-bold">Direction_Bias</span>
          </div>

          <div className="flex gap-1 h-8 rounded p-1 bg-black/60 border border-white/5 shadow-inner">
            <div
              className="bg-terminal-green/80 rounded flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-700 shadow-[0_0_10px_rgba(0,255,157,0.2)]"
              style={{ width: `${risk.directionBias.yes}%` }}
            >
              {risk.directionBias.yes > 15 && <span className="text-black drop-shadow-md">YES {risk.directionBias.yes}%</span>}
            </div>
            <div
              className="bg-terminal-red/80 rounded flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-700 shadow-[0_0_10px_rgba(255,51,102,0.2)]"
              style={{ width: `${risk.directionBias.no}%` }}
            >
              {risk.directionBias.no > 15 && <span className="text-white drop-shadow-md">NO {risk.directionBias.no}%</span>}
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-terminal-dim mt-4 uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-terminal-green/50"></span> Bullish base</span>
            <span className="flex items-center gap-1">Bearish base <span className="w-1.5 h-1.5 rounded-full bg-terminal-red/50"></span></span>
          </div>
        </div>
      </div>
    </div>
  )
}
