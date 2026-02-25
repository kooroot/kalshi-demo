import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProfile, type PersonalityAnalysis, type PersonalityScores } from '@/lib/api'

export function ComparePage() {
  const navigate = useNavigate()
  const [userA, setUserA] = useState('')
  const [userB, setUserB] = useState('')
  const [comparing, setComparing] = useState<{ a: string; b: string } | null>(null)

  const profileA = useQuery({
    queryKey: ['profile', comparing?.a],
    queryFn: () => getProfile(comparing!.a),
    enabled: !!comparing?.a,
    retry: false,
  })

  const profileB = useQuery({
    queryKey: ['profile', comparing?.b],
    queryFn: () => getProfile(comparing!.b),
    enabled: !!comparing?.b,
    retry: false,
  })

  const handleCompare = () => {
    if (userA.trim() && userB.trim()) {
      setComparing({ a: userA.trim(), b: userB.trim() })
    }
  }

  const isLoading = profileA.isLoading || profileB.isLoading
  const hasResults = profileA.data && profileB.data
  const hasError = profileA.error || profileB.error

  return (
    <div className="min-h-screen bg-terminal grid-bg text-terminal-text selection:bg-terminal-green/30 selection:text-white">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="fixed top-0 w-full border-b border-white/5 bg-terminal-bg/80 backdrop-blur-md px-6 py-3 flex items-center justify-between z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
              <div className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#d29922]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950]" />
            </div>
          </div>
          <div className="h-4 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Shield & Scout" className="w-6 h-6 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
            <span className="text-terminal-cyan text-xs font-black tracking-[0.15em]">COMPARE</span>
          </div>
        </div>
        <Button
          onClick={() => navigate({ to: '/' })}
          variant="outline"
          className="h-8 text-[10px] uppercase tracking-wider font-bold border-terminal-border text-terminal-dim hover:text-white hover:bg-white/5"
        >
          Back
        </Button>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-6 max-w-6xl mx-auto space-y-8">
        {/* Search Panel */}
        <div className="terminal-glass-panel p-8 rounded-xl border border-terminal-cyan/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-terminal-cyan via-terminal-purple to-terminal-cyan opacity-50" />
          <div className="text-[10px] text-terminal-dim font-mono uppercase tracking-[0.3em] mb-6">Trader_Comparison_Engine</div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] text-terminal-cyan uppercase tracking-widest font-bold">Trader A</label>
              <Input
                placeholder="Username..."
                value={userA}
                onChange={(e) => setUserA(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                className="h-10 bg-black/60 border-terminal-cyan/30 text-white placeholder:text-zinc-600 focus:border-terminal-cyan focus:ring-1 focus:ring-terminal-cyan/50 rounded font-mono text-sm tracking-wider"
              />
            </div>

            <div className="text-terminal-dim text-2xl font-black pb-1">VS</div>

            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] text-terminal-purple uppercase tracking-widest font-bold">Trader B</label>
              <Input
                placeholder="Username..."
                value={userB}
                onChange={(e) => setUserB(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                className="h-10 bg-black/60 border-terminal-purple/30 text-white placeholder:text-zinc-600 focus:border-terminal-purple focus:ring-1 focus:ring-terminal-purple/50 rounded font-mono text-sm tracking-wider"
              />
            </div>

            <Button
              onClick={handleCompare}
              disabled={!userA.trim() || !userB.trim() || isLoading}
              className="h-10 px-6 bg-terminal-cyan/10 hover:bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 text-xs uppercase font-bold tracking-wider disabled:opacity-30"
            >
              {isLoading ? 'Analyzing...' : 'Compare'}
            </Button>
          </div>
        </div>

        {/* Error */}
        {hasError && (
          <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-red/30 text-center">
            <div className="text-terminal-red text-sm font-mono">
              {profileA.error ? `Trader A: ${profileA.error.message}` : ''}
              {profileA.error && profileB.error ? ' | ' : ''}
              {profileB.error ? `Trader B: ${profileB.error.message}` : ''}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="terminal-glass-panel p-12 text-center rounded-xl">
            <div className="text-terminal-cyan text-lg font-black tracking-widest animate-pulse">COMPARING...</div>
          </div>
        )}

        {/* Results */}
        {hasResults && (
          <CompareResults
            nameA={profileA.data.username || comparing!.a}
            nameB={profileB.data.username || comparing!.b}
            analysisA={profileA.data.analysis}
            analysisB={profileB.data.analysis}
          />
        )}
      </main>
    </div>
  )
}

function CompareResults({ nameA, nameB, analysisA, analysisB }: {
  nameA: string; nameB: string
  analysisA: PersonalityAnalysis; analysisB: PersonalityAnalysis
}) {
  return (
    <div className="space-y-6">
      {/* Identity Cards */}
      <div className="grid grid-cols-2 gap-6">
        <IdentityCard name={nameA} analysis={analysisA} color="cyan" />
        <IdentityCard name={nameB} analysis={analysisB} color="purple" />
      </div>

      {/* Head-to-Head Stats */}
      <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-terminal-cyan via-transparent to-terminal-purple" />
        <div className="text-[10px] text-terminal-dim font-mono uppercase tracking-[0.3em] mb-6">Head_to_Head</div>

        <div className="space-y-3">
          <CompareBar label="Win Rate" valA={analysisA.winRate.percentage} valB={analysisB.winRate.percentage} suffix="%" />
          <CompareBar label="ROI" valA={analysisA.roi.percentage} valB={analysisB.roi.percentage} suffix="%" signed />
          <CompareBar label="Total Trades" valA={analysisA.frequency.totalTrades} valB={analysisB.frequency.totalTrades} />
          <CompareBar label="Trades/Day" valA={analysisA.frequency.tradesPerDay} valB={analysisB.frequency.tradesPerDay} />
          <CompareBar label="Avg Entry" valA={analysisA.riskProfile.avgEntryPrice} valB={analysisB.riskProfile.avgEntryPrice} suffix="c" />
          {analysisA.pnlAnalysis && analysisB.pnlAnalysis && (
            <>
              <CompareBar label="Profit Factor" valA={analysisA.pnlAnalysis.profitFactor} valB={analysisB.pnlAnalysis.profitFactor} decimals={2} />
              <CompareBar label="Expectancy" valA={analysisA.pnlAnalysis.expectancy / 100} valB={analysisB.pnlAnalysis.expectancy / 100} suffix="$" signed decimals={2} />
            </>
          )}
        </div>
      </div>

      {/* Radar Comparison */}
      {analysisA.scores && analysisB.scores && (
        <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border relative overflow-hidden">
          <div className="text-[10px] text-terminal-dim font-mono uppercase tracking-[0.3em] mb-4">Personality_Radar_Overlay</div>
          <div className="flex justify-center">
            <CompareRadar scoresA={analysisA.scores} scoresB={analysisB.scores} nameA={nameA} nameB={nameB} />
          </div>
        </div>
      )}

      {/* Category Comparison */}
      {analysisA.categoryPerformance && analysisB.categoryPerformance && (
        <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border relative overflow-hidden">
          <div className="text-[10px] text-terminal-dim font-mono uppercase tracking-[0.3em] mb-4">Category_Comparison</div>
          <CategoryCompare perfA={analysisA.categoryPerformance} perfB={analysisB.categoryPerformance} nameA={nameA} nameB={nameB} />
        </div>
      )}
    </div>
  )
}

function IdentityCard({ name, analysis, color }: { name: string; analysis: PersonalityAnalysis; color: 'cyan' | 'purple' }) {
  const borderColor = color === 'cyan' ? 'border-terminal-cyan/30 hover:border-terminal-cyan/60' : 'border-terminal-purple/30 hover:border-terminal-purple/60'
  const textColor = color === 'cyan' ? 'text-terminal-cyan' : 'text-terminal-purple'

  return (
    <div className={`terminal-glass-panel p-5 rounded-xl border ${borderColor} transition-all relative overflow-hidden group`}>
      <div className="flex items-center gap-4">
        <div className="text-5xl">{analysis.tag.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-bold uppercase tracking-widest ${textColor} mb-1`}>{name}</div>
          <div className="text-xl font-black text-white truncate">{analysis.tag.name}</div>
          <div className="text-terminal-muted text-xs mt-1 line-clamp-1">{analysis.tag.description}</div>
          {analysis.traits && analysis.traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {analysis.traits.map((t, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono">{t.emoji} {t.name}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompareBar({ label, valA, valB, suffix = '', signed = false, decimals = 0 }: {
  label: string; valA: number; valB: number; suffix?: string; signed?: boolean; decimals?: number
}) {
  const maxAbs = Math.max(Math.abs(valA), Math.abs(valB), 0.01)
  const widthA = (Math.abs(valA) / maxAbs) * 100
  const widthB = (Math.abs(valB) / maxAbs) * 100
  const winnerA = valA > valB
  const winnerB = valB > valA
  const tie = valA === valB

  const format = (v: number) => {
    const num = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
    return signed && v > 0 ? `+${num}` : num
  }

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
      {/* A side */}
      <div className="flex items-center gap-2 justify-end">
        <span className={`text-xs font-mono font-bold ${winnerA ? 'text-terminal-cyan' : 'text-terminal-dim'}`}>
          {format(valA)}{suffix}
        </span>
        <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 flex justify-end">
          <div
            className={`h-full rounded-full transition-all duration-700 ${winnerA ? 'bg-terminal-cyan shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'bg-terminal-dim/50'}`}
            style={{ width: `${widthA}%` }}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold text-center min-w-[80px]">
        {tie ? `${label} =` : label}
      </div>

      {/* B side */}
      <div className="flex items-center gap-2">
        <div className="w-32 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${winnerB ? 'bg-terminal-purple shadow-[0_0_8px_rgba(168,85,247,0.4)]' : 'bg-terminal-dim/50'}`}
            style={{ width: `${widthB}%` }}
          />
        </div>
        <span className={`text-xs font-mono font-bold ${winnerB ? 'text-terminal-purple' : 'text-terminal-dim'}`}>
          {format(valB)}{suffix}
        </span>
      </div>
    </div>
  )
}

function CompareRadar({ scoresA, scoresB, nameA, nameB }: { scoresA: PersonalityScores; scoresB: PersonalityScores; nameA: string; nameB: string }) {
  const axes = [
    { label: 'RISK', valA: (scoresA.riskAppetite + 100) / 2, valB: (scoresB.riskAppetite + 100) / 2 },
    { label: 'DIVERSE', valA: scoresA.diversification, valB: scoresB.diversification },
    { label: 'FREQ', valA: scoresA.frequency, valB: scoresB.frequency },
    { label: 'SKILL', valA: scoresA.skill, valB: scoresB.skill },
    { label: 'TREND', valA: (scoresA.trend + 100) / 2, valB: (scoresB.trend + 100) / 2 },
    { label: 'CONVICT', valA: scoresA.conviction, valB: scoresB.conviction },
  ]

  const cx = 160, cy = 160, R = 110
  const n = axes.length

  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const rings = [0.25, 0.5, 0.75, 1.0]

  const pathA = axes.map((a, i) => getPoint(i, (a.valA / 100) * R)).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
  const pathB = axes.map((a, i) => getPoint(i, (a.valB / 100) * R)).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 320 320" className="w-full max-w-[320px]">
        {/* Grid */}
        {rings.map((r) => {
          const pts = axes.map((_, i) => getPoint(i, r * R))
          const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
          return <path key={r} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        })}
        {axes.map((_, i) => {
          const p = getPoint(i, R)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        })}

        {/* Data A (cyan) */}
        <path d={pathA} fill="rgba(0,240,255,0.1)" stroke="rgba(0,240,255,0.7)" strokeWidth="2" />
        {/* Data B (purple) */}
        <path d={pathB} fill="rgba(168,85,247,0.1)" stroke="rgba(168,85,247,0.7)" strokeWidth="2" />

        {/* Labels */}
        {axes.map((a, i) => {
          const lp = getPoint(i, R + 24)
          return (
            <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 font-mono font-bold" style={{ fontSize: '9px' }}>
              {a.label}
            </text>
          )
        })}
      </svg>

      <div className="flex items-center gap-6 text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-terminal-cyan rounded-full" />
          <span className="text-terminal-cyan">{nameA}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1 bg-terminal-purple rounded-full" />
          <span className="text-terminal-purple">{nameB}</span>
        </div>
      </div>
    </div>
  )
}

function CategoryCompare({ perfA, perfB, nameA, nameB }: {
  perfA: PersonalityAnalysis['categoryPerformance'] & {}
  perfB: PersonalityAnalysis['categoryPerformance'] & {}
  nameA: string; nameB: string
}) {
  // Merge all unique categories
  const allCats = Array.from(new Set([...perfA.map(p => p.category), ...perfB.map(p => p.category)]))
  const mapA = new Map(perfA.map(p => [p.category, p]))
  const mapB = new Map(perfB.map(p => [p.category, p]))

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-[9px] text-zinc-500 uppercase tracking-widest font-bold mb-3">
        <div className="text-right text-terminal-cyan">{nameA}</div>
        <div className="text-center min-w-[80px]">Category</div>
        <div className="text-terminal-purple">{nameB}</div>
      </div>

      {allCats.slice(0, 8).map(cat => {
        const a = mapA.get(cat)
        const b = mapB.get(cat)
        return (
          <div key={cat} className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center bg-black/20 rounded-lg px-3 py-2 border border-white/5 hover:border-white/10 transition-colors">
            <div className="text-right text-xs font-mono">
              {a ? (
                <span>
                  <span className={a.winRate >= 50 ? 'text-terminal-green' : 'text-terminal-red'}>{a.winRate}%</span>
                  <span className="text-terminal-dim mx-1">|</span>
                  <span className={a.totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>{a.totalPnl >= 0 ? '+' : ''}{(a.totalPnl / 100).toFixed(2)}</span>
                </span>
              ) : <span className="text-terminal-dim">--</span>}
            </div>
            <div className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold text-center min-w-[80px]">{cat}</div>
            <div className="text-xs font-mono">
              {b ? (
                <span>
                  <span className={b.winRate >= 50 ? 'text-terminal-green' : 'text-terminal-red'}>{b.winRate}%</span>
                  <span className="text-terminal-dim mx-1">|</span>
                  <span className={b.totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>{b.totalPnl >= 0 ? '+' : ''}{(b.totalPnl / 100).toFixed(2)}</span>
                </span>
              ) : <span className="text-terminal-dim">--</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
