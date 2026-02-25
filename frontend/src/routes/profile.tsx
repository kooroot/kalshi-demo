import { useState } from 'react'
import { useParams, useNavigate, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getProfile, getRecommendations, getBalance, executeRecommendOrder, type PersonalityAnalysis, type MarketRecommendation, type CategoryPerformance, type PnlAnalysis, type TemporalAnalysis, type PersonalityScores } from '@/lib/api'
import { UserSidebar } from '@/components/user-sidebar'
import { Activity, ArrowUpRight, ArrowDownRight, Trophy, Info } from 'lucide-react'

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex items-center gap-1 cursor-help">
      {children}
      <Info className="w-2.5 h-2.5 opacity-30 group-hover/tip:opacity-70 transition-opacity" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-black/95 border border-white/10 rounded text-[10px] text-zinc-300 font-normal normal-case tracking-normal whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 group-hover/tip:pointer-events-auto transition-opacity z-50 shadow-xl max-w-[250px] text-wrap leading-relaxed">
        {text}
      </span>
    </span>
  )
}
export function ProfilePage() {
  const { username } = useParams({ from: '/scout/$username' })
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const profileQuery = useQuery({
    queryKey: ['profile', username],
    queryFn: () => getProfile(username),
  })

  const isOwner = profileQuery.data?.isOwner ?? false

  const recommendQuery = useQuery({
    queryKey: ['recommendations', username],
    queryFn: () => getRecommendations(username),
    enabled: !!profileQuery.data && isOwner,
    retry: false,
  })

  const balanceQuery = useQuery({
    queryKey: ['balance', username],
    queryFn: () => getBalance(username),
    enabled: isOwner,
  })

  const copyShareLink = () => {
    const shareUsername = profileQuery.data?.username || username
    const url = `${window.location.origin}/scout/${shareUsername}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOnTwitter = () => {
    const analysis = profileQuery.data?.analysis
    if (!analysis) return
    const shareUsername = profileQuery.data?.username || username
    const text = `I'm a "${analysis.tag.name} ${analysis.tag.emoji}" on Kalshi!\nWin rate: ${analysis.winRate.percentage}% | ROI: ${analysis.roi.percentage}%\n\nDiscover your trading personality:`
    const ogUrl = `http://localhost:3003/api/og/${shareUsername}/meta`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ogUrl)}`, '_blank')
  }

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-terminal grid-bg flex items-center justify-center">
        <div className="terminal-glass-panel p-16 text-center rounded-2xl border border-terminal-green/30 shadow-[0_0_50px_rgba(63,185,80,0.15)] backdrop-blur-xl">
          <div className="text-terminal-green text-3xl mb-6 font-black tracking-[0.2em] animate-pulse">ANALYZING_DATA_STREAM</div>
          <div className="text-terminal-muted text-sm font-mono tracking-widest uppercase">Decryption in progress...</div>
          <div className="mt-8 flex justify-center gap-2">
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-1 h-8 bg-terminal-green/50 rounded-full animate-[pulse_1s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (profileQuery.error?.message?.includes('expired') || profileQuery.error?.message?.includes('reconnect')) {
    return (
      <div className="min-h-screen bg-terminal grid-bg flex items-center justify-center">
        <div className="terminal-glass-panel p-16 text-center space-y-8 rounded-2xl max-w-md border border-terminal-yellow/30 shadow-2xl backdrop-blur-xl">
          <div className="text-terminal-yellow text-6xl mb-4 drop-shadow-[0_0_15px_rgba(227,179,65,0.4)]">!</div>
          <div className="text-2xl font-black text-white uppercase tracking-widest">Session Expired</div>
          <div className="text-terminal-muted text-base font-mono leading-relaxed">Security protocol requires re-authentication. Uplink severed.</div>
          <Button
            onClick={() => navigate({ to: '/' })}
            className="w-full bg-terminal-yellow/10 hover:bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/50"
          >
            Reconnect Uplink
          </Button>
        </div>
      </div>
    )
  }

  if (profileQuery.error?.message?.includes('not found')) {
    return (
      <div className="min-h-screen bg-terminal grid-bg flex items-center justify-center">
        <div className="terminal-glass-panel p-16 text-center space-y-8 rounded-2xl max-w-md border border-terminal-blue/30 shadow-2xl backdrop-blur-xl">
          <div className="text-terminal-blue text-6xl mb-4 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">?</div>
          <div className="text-2xl font-black text-white uppercase tracking-widest">Profile Not Found</div>
          <div className="text-terminal-muted text-base font-mono leading-relaxed">No trader profile found for "{username}". Connect your account to create one.</div>
          <Button
            onClick={() => navigate({ to: '/' })}
            className="w-full bg-terminal-blue/10 hover:bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/50"
          >
            Connect Your Account
          </Button>
        </div>
      </div>
    )
  }

  if (profileQuery.error) {
    return (
      <div className="min-h-screen bg-terminal grid-bg flex items-center justify-center">
        <div className="terminal-glass-panel p-16 text-center space-y-8 rounded-2xl max-w-md border border-terminal-red/30 shadow-2xl backdrop-blur-xl">
          <div className="text-terminal-red text-6xl mb-4 drop-shadow-[0_0_15px_rgba(248,81,73,0.4)]">x</div>
          <div className="text-2xl font-black text-white uppercase tracking-widest">System Failure</div>
          <div className="text-terminal-red/80 text-sm font-mono bg-black/60 p-4 rounded border border-terminal-red/20 overflow-x-auto whitespace-pre-wrap">{profileQuery.error.message}</div>
          <Button
            onClick={() => navigate({ to: '/' })}
            variant="outline"
            className="w-full border-terminal-bright text-terminal-muted hover:text-terminal-text hover:bg-white/5"
          >
            Return to Base
          </Button>
        </div>
      </div>
    )
  }

  const analysis = profileQuery.data?.analysis

  return (
    <div className="min-h-screen bg-terminal grid-bg text-terminal-text selection:bg-terminal-green/30 selection:text-white">
      {/* Noise overlay */}
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
            <span className="text-terminal-blue text-xs font-black tracking-[0.15em]">SHIELD</span>
            <span className="text-terminal-dim text-[10px] font-light">&</span>
            <span className="text-terminal-green text-xs font-black tracking-[0.15em]">SCOUT</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono font-medium">
          {/* Nav tabs */}
          <nav className="flex items-center bg-black/60 rounded border border-terminal-border p-1 shadow-inner relative overflow-hidden">
            <div className="absolute left-1/2 top-1 bottom-1 w-[1px] bg-terminal-border/50 z-0" />
            <div className="relative z-10 flex-1 min-w-[130px] flex flex-col items-center justify-center py-1.5 text-[10px] sm:text-xs tracking-widest uppercase font-black text-black bg-terminal-green scale-100 rounded-sm shadow-[0_0_15px_rgba(0,255,157,0.4)]">
              <span className="text-[8px] font-bold text-black/60 tracking-wider mb-0.5 leading-none">ACTIVE_MODE</span>
              <span className="leading-none">SCOUT</span>
            </div>
            {isOwner && (
              <Link to="/shield/$username" params={{ username }} className="relative z-10 flex-1 min-w-[130px] flex flex-col items-center justify-center py-1.5 text-[10px] sm:text-xs tracking-widest uppercase font-bold text-terminal-muted hover:text-terminal-blue transition-colors hover:bg-terminal-blue/5 rounded-sm">
                <span className="text-[8px] text-terminal-dim tracking-wider mb-0.5 leading-none">STANDBY</span>
                <span className="leading-none">SHIELD</span>
              </Link>
            )}
          </nav>

          {/* User Menu Trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 px-2 py-1 rounded-full border border-terminal-border bg-black/40 hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isOwner && balanceQuery.data && (
              <span className="text-terminal-green text-[10px] font-bold font-mono">${balanceQuery.data.balanceDollars}</span>
            )}
            <Avatar className="w-7 h-7 border border-terminal-green/30">
              <AvatarFallback className="bg-gradient-to-br from-terminal-green/20 to-terminal-blue/20 text-terminal-green text-xs font-black">
                {(profileQuery.data?.username || username)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isOwner || !balanceQuery.data ? (
              profileQuery.data?.username && (
                <span className="text-terminal-text text-xs font-bold tracking-wider">
                  {profileQuery.data.username}
                </span>
              )
            ) : null}
            <svg className="w-3 h-3 text-terminal-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </header>

      <UserSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={profileQuery.data?.username || username}
        profileId={profileQuery.data?.profileId}
        isOwner={isOwner}
        balanceDollars={balanceQuery.data?.balanceDollars}
      />

      <main className="pt-24 pb-12 px-4 md:px-6 max-w-7xl mx-auto space-y-8">

        {/* Public view banner */}
        {!isOwner && (
          <div className={`${profileQuery.data?.source === 'social' ? 'bg-terminal-green/5 border-terminal-green/30' : 'bg-terminal-purple/5 border-terminal-purple/30'} border rounded-lg p-4 flex items-center justify-between opacity-0 animate-fade-in-up`}>
            <div className="flex items-center gap-3">
              <span className={`${profileQuery.data?.source === 'social' ? 'text-terminal-green' : 'text-terminal-purple'} text-lg`}>
                {profileQuery.data?.source === 'social' ? 'K' : 'i'}
              </span>
              <div>
                <div className="text-terminal-text text-sm font-bold tracking-wider">
                  {profileQuery.data?.source === 'social' ? 'KALSHI PUBLIC DATA' : 'PUBLIC PROFILE'}
                </div>
                <div className="text-terminal-muted text-xs font-mono">
                  {profileQuery.data?.source === 'social'
                    ? 'Analyzed from public Kalshi trading data. Connect your account for live data and recommendations.'
                    : 'Viewing cached analysis. Connect your account for live data and recommendations.'}
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate({ to: '/' })}
              className={`${profileQuery.data?.source === 'social' ? 'bg-terminal-green/10 hover:bg-terminal-green/20 text-terminal-green border-terminal-green/30' : 'bg-terminal-purple/10 hover:bg-terminal-purple/20 text-terminal-purple border-terminal-purple/30'} text-xs uppercase tracking-wider font-bold`}
            >
              Connect
            </Button>
          </div>
        )}

        {/* Personality Card - Hero Section */}
        {analysis && (
          <div className="opacity-0 animate-fade-in-up">
            <PersonalityHero analysis={analysis} onShare={copyShareLink} onTwitter={shareOnTwitter} copied={copied} username={profileQuery.data?.username || username} />
          </div>
        )}

        {/* Stats Grid */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-0 animate-fade-in-up stagger-1">
            <CategoryPerformancePanel categories={analysis.categories} categoryPerformance={analysis.categoryPerformance} />
            <RiskPanel riskProfile={analysis.riskProfile} />
            <PnlAnalysisPanel winRate={analysis.winRate} roi={analysis.roi} pnlAnalysis={analysis.pnlAnalysis} />
          </div>
        )}

        {/* Radar Chart + Temporal Panel */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-0 animate-fade-in-up stagger-1">
            <RadarChartPanel scores={analysis.scores} />
            <TemporalPanel temporal={analysis.temporal} />
          </div>
        )}

        {/* Recommendations — only for owner */}
        {isOwner && (
          <div className="opacity-0 animate-fade-in-up stagger-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-terminal-green rounded-sm shadow-[0_0_10px_rgba(0,255,157,0.5)]" />
                <div>
                  <h2 className="text-lg font-bold tracking-wider text-white">MARKET_OPPORTUNITIES</h2>
                  <div className="text-[10px] text-terminal-muted font-mono uppercase tracking-widest">AI-Matched Predictions</div>
                </div>
              </div>
              <div className="text-xs font-mono text-terminal-dim tracking-widest uppercase font-bold">
                params: <span className="text-terminal-green">--high-confidence</span>
              </div>
            </div>

            {recommendQuery.isLoading ? (
              <div className="terminal-glass-panel p-12 text-center rounded-xl border-dashed border-white/10">
                <span className="text-terminal-muted animate-pulse">Scanning markets...</span>
              </div>
            ) : recommendQuery.error ? (
              <div className="terminal-glass-panel p-12 text-center rounded-xl border-terminal-red/20">
                <span className="text-terminal-red">Failed to load recommendations</span>
              </div>
            ) : recommendQuery.data?.recommendations ? (
              <RecommendationsGrid recommendations={recommendQuery.data.recommendations} profileId={profileQuery.data?.profileId || username} isOwner={isOwner} />
            ) : null}
          </div>
        )}
      </main>

      {/* Decorative footer gradient */}
      <div className="fixed bottom-0 left-0 w-full h-32 bg-gradient-to-t from-terminal-green/5 to-transparent pointer-events-none -z-10" />
    </div>
  )
}

function PersonalityHero({ analysis, onShare, onTwitter, copied, username }: { analysis: PersonalityAnalysis; onShare: () => void; onTwitter: () => void; copied: boolean; username: string }) {
  const getTagColor = (tag: string) => {
    if (tag.includes('Degen') || tag.includes('High')) return 'text-terminal-red shadow-red'
    if (tag.includes('Safe') || tag.includes('Conservative')) return 'text-terminal-green shadow-green'
    if (tag.includes('Political')) return 'text-terminal-blue shadow-blue'
    if (tag.includes('Crypto')) return 'text-terminal-orange shadow-orange'
    if (tag.includes('Explorer')) return 'text-terminal-cyan shadow-cyan'
    return 'text-terminal-purple shadow-purple'
  }

  return (
    <div className="terminal-glass-panel rounded-xl overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-terminal-green via-terminal-cyan to-terminal-purple opacity-50" />

      <div className="p-8 md:p-10 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10 items-start">

          {/* Left: Main Identity */}
          <div className="flex-1 flex gap-6 items-start">
            <div className="text-7xl md:text-8xl bg-black/30 p-4 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm grayscale-[0.2] hover:grayscale-0 transition-all duration-500 transform hover:scale-105 hover:rotate-2">
              {analysis.tag.emoji}
            </div>
            <div className="space-y-2 pt-2">
              <div className="text-terminal-dim text-xs font-bold uppercase tracking-[0.3em] mb-2">TRADER_IDENTITY_CLASSIFICATION</div>
              <h1 className={`text-5xl md:text-6xl font-black tracking-tight text-white mb-4 ${getTagColor(analysis.tag.name).split(' ')[0]} text-glow`}>
                {analysis.tag.name}
              </h1>
              <p className="text-terminal-muted text-base md:text-lg max-w-xl leading-relaxed font-light border-l-2 border-terminal-green/30 pl-5 py-1">
                {analysis.tag.description}
              </p>
              {/* Trait Badges */}
              {analysis.traits && analysis.traits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {analysis.traits.map((trait: { emoji: string; name: string }, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-terminal-text hover:border-terminal-green/40 hover:bg-terminal-green/5 transition-all">
                      <span>{trait.emoji}</span>
                      <span>{trait.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-3 min-w-[200px]">
            <Button
              onClick={onShare}
              className={`h-12 border transition-all uppercase tracking-wider text-xs font-bold ${copied
                ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/50'
                : 'bg-white/5 hover:bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan/30 hover:border-terminal-cyan'
                }`}
            >
              {copied ? 'Copied!' : 'Copy Share Link'}
            </Button>
            <Button
              onClick={onTwitter}
              className="h-10 bg-white/5 hover:bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/30 hover:border-[#1DA1F2] text-[10px] uppercase font-bold tracking-wider transition-all"
            >
              Share on X / Twitter
            </Button>
            <Button
              onClick={() => window.open(`http://localhost:3003/api/og/${username}`, '_blank')}
              className="h-10 bg-white/5 hover:bg-terminal-purple/10 text-terminal-purple border border-terminal-purple/30 hover:border-terminal-purple text-[10px] uppercase font-bold tracking-wider transition-all"
            >
              Preview Share Card
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/5">
          <StatBlock
            label="WIN RATIO"
            tooltip="Percentage of settled markets that resulted in a profit"
            value={`${analysis.winRate.percentage}%`}
            color={analysis.winRate.percentage >= 50 ? 'green' : 'red'}
            trend={analysis.winRate.percentage >= 50 ? 'up' : 'down'}
            icon={<img src="/icons/activity.png" alt="Win Ratio" className="w-6 h-6 mix-blend-screen object-cover scale-[1.6]" />}
            badge={analysis.temporal?.currentStreak && analysis.temporal.currentStreak.count >= 3
              ? `${analysis.temporal.currentStreak.type === 'win' ? '🔥' : '🥶'}${analysis.temporal.currentStreak.count}`
              : undefined}
          />
          <StatBlock
            label="NET ROI"
            tooltip="Return on Investment: (revenue - cost) / cost as a percentage"
            value={`${analysis.roi.percentage >= 0 ? '+' : ''}${analysis.roi.percentage}%`}
            color={analysis.roi.percentage >= 0 ? 'green' : 'red'}
            trend={analysis.roi.percentage >= 0 ? 'up-right' : 'down-right'}
            icon={<img src="/icons/wallet.png" alt="ROI" className="w-6 h-6 mix-blend-screen object-cover scale-[1.6]" />}
            badge={analysis.temporal?.trend === 'improving' ? '📈' : analysis.temporal?.trend === 'declining' ? '📉' : undefined}
          />
          <StatBlock
            label="TOTAL EXECUTION"
            tooltip="Total number of individual trade fills executed"
            value={analysis.frequency.totalTrades.toString()}
            color="blue"
            icon={<img src="/icons/scout.png" alt="Execution" className="w-6 h-6 mix-blend-screen object-cover scale-[1.6]" />}
          />
          <StatBlock
            label="VELOCITY (DAY)"
            tooltip="Average number of trades per active trading day"
            value={analysis.frequency.tradesPerDay.toString()}
            color="cyan"
            icon={<img src="/icons/activity.png" alt="Velocity" className="w-6 h-6 mix-blend-screen object-cover scale-[1.6]" />}
          />
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-terminal-green/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  )
}

function StatBlock({ label, value, color, trend, icon, badge, tooltip }: { label: string; value: string; color: string; trend?: string; icon?: React.ReactNode; badge?: string; tooltip?: string }) {
  const styles: Record<string, string> = {
    green: 'border-terminal-green/20 group-hover:border-terminal-green/50 bg-terminal-green/5 shadow-[0_0_15px_rgba(0,255,157,0.05)] text-terminal-green hover:shadow-terminal-green/20 group-hover:text-terminal-green',
    red: 'border-terminal-red/20 group-hover:border-terminal-red/50 bg-terminal-red/5 shadow-[0_0_15px_rgba(255,51,102,0.05)] text-terminal-red hover:shadow-terminal-red/20 group-hover:text-terminal-red',
    cyan: 'border-terminal-cyan/20 group-hover:border-terminal-cyan/50 bg-terminal-cyan/5 shadow-[0_0_15px_rgba(0,240,255,0.05)] text-terminal-cyan hover:shadow-terminal-cyan/20 group-hover:text-terminal-cyan',
    blue: 'border-terminal-blue/20 group-hover:border-terminal-blue/50 bg-terminal-blue/5 shadow-[0_0_15px_rgba(59,130,246,0.05)] text-terminal-blue hover:shadow-terminal-blue/20 group-hover:text-terminal-blue',
    yellow: 'border-terminal-yellow/20 group-hover:border-terminal-yellow/50 bg-terminal-yellow/5 shadow-[0_0_15px_rgba(245,158,11,0.05)] text-terminal-yellow hover:shadow-terminal-yellow/20 group-hover:text-terminal-yellow',
  }

  const trendIcons: Record<string, React.ReactNode> = {
    'up': <ArrowUpRight className="w-4 h-4 opacity-100" strokeWidth={3} />,
    'down': <ArrowDownRight className="w-4 h-4 opacity-100" strokeWidth={3} />,
    'up-right': <ArrowUpRight className="w-4 h-4 opacity-100" strokeWidth={3} />,
    'down-right': <ArrowDownRight className="w-4 h-4 opacity-100" strokeWidth={3} />,
  }

  return (
    <div className={`terminal-glass-panel p-5 rounded-xl border transition-all duration-300 relative overflow-hidden group ${styles[color] || ''}`}>
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity bg-current`} />

      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className="text-zinc-500 text-[10px] uppercase tracking-widest group-hover:text-current transition-colors font-bold">
          {tooltip ? <Tip text={tooltip}>{label}</Tip> : label}
        </div>
        {icon && <div className="opacity-50 group-hover:opacity-100 transition-opacity bg-black/40 p-1.5 rounded-md border border-white/5">{icon}</div>}
      </div>

      <div className="text-2xl md:text-3xl font-black font-mono relative z-10 drop-shadow-[0_0_12px_currentColor] text-current flex items-center gap-2">
        {value}
        {trend && trendIcons[trend]}
        {badge && <span className="text-sm ml-1">{badge}</span>}
      </div>
    </div>
  )
}

function CategoryPerformancePanel({ categories, categoryPerformance }: { categories: PersonalityAnalysis['categories']; categoryPerformance?: CategoryPerformance[] }) {
  const colors = ['bg-terminal-green', 'bg-terminal-cyan', 'bg-terminal-blue', 'bg-terminal-purple', 'bg-terminal-orange']
  const colorHex = ['rgba(16,185,129', 'rgba(0,240,255', 'rgba(59,130,246', 'rgba(168,85,247', 'rgba(249,115,22']

  // Merge category data with performance data
  const perfMap = new Map(categoryPerformance?.map(cp => [cp.category, cp]) || [])

  // Find best/worst categories by PnL
  const bestCat = categoryPerformance?.[0]?.category // already sorted by totalPnl desc
  const worstCat = categoryPerformance && categoryPerformance.length > 1
    ? categoryPerformance[categoryPerformance.length - 1].category
    : undefined

  return (
    <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-blue/40 transition-all shadow-lg hover:shadow-terminal-blue/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-blue/5 rounded-full blur-3xl group-hover:bg-terminal-blue/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <span className="text-terminal-blue text-xs animate-pulse">●</span>
        <span className="text-white text-xs uppercase tracking-widest font-bold"><Tip text="Trade distribution and win rates across market categories">Sector_Performance</Tip></span>
      </div>

      {categories.length === 0 ? (
        <div className="text-terminal-dim text-sm italic">Insufficient data for sector analysis</div>
      ) : (
        <div className="space-y-4">
          {categories.slice(0, 5).map((cat, i) => {
            const perf = perfMap.get(cat.name)
            const isBest = cat.name === bestCat
            const isWorst = cat.name === worstCat && (perf?.totalPnl ?? 0) < 0
            return (
              <div key={i} className="space-y-1.5 group/bar">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="text-terminal-text group-hover/bar:text-white transition-colors flex items-center gap-1.5">
                    {isBest && <span title="Best category">🏆</span>}
                    {isWorst && <span title="Worst category">⚠️</span>}
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {perf && (
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${perf.winRate >= 50 ? 'text-terminal-green border-terminal-green/20 bg-terminal-green/5' : 'text-terminal-red border-terminal-red/20 bg-terminal-red/5'}`}>
                        {perf.winRate}% WR
                      </span>
                    )}
                    {perf && (
                      <span className={`font-mono text-[9px] ${perf.totalPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {perf.totalPnl >= 0 ? '+' : ''}{(perf.totalPnl / 100).toFixed(2)}
                      </span>
                    )}
                    <span className="font-mono text-terminal-muted group-hover/bar:text-terminal-text transition-colors text-[10px]">{cat.percentage}%</span>
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
  )
}

function RiskPanel({ riskProfile }: { riskProfile: PersonalityAnalysis['riskProfile'] }) {
  const total = riskProfile.highRiskCount + riskProfile.midRiskCount + riskProfile.lowRiskCount
  const glowType = riskProfile.type === 'high_risk' ? 'red' : riskProfile.type === 'moderate' ? 'yellow' : 'green'

  return (
    <div className={`terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-${glowType}/40 transition-all shadow-lg hover:shadow-terminal-${glowType}/10 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-terminal-${glowType}/5 rounded-full blur-3xl group-hover:bg-terminal-${glowType}/10 transition-all duration-700 pointer-events-none`} />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <span className={`text-terminal-${glowType} text-xs animate-pulse`}>●</span>
        <span className="text-white text-xs uppercase tracking-widest font-bold"><Tip text="Based on entry price distribution: low (&lt;30c), mid (30-70c), high (&gt;70c)">Risk_Exposure</Tip></span>
      </div>

      <div className="flex flex-col items-center justify-center py-4 relative">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="60" fill="none" stroke="#1c1c1c" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="60" fill="none" stroke="#3fb950" strokeWidth="8"
              strokeDasharray={`${(riskProfile.lowRiskCount / total) * 377} 377`}
              className="drop-shadow-[0_0_8px_rgba(63,185,80,0.5)]"
            />
            <circle
              cx="64" cy="64" r="60" fill="none" stroke="#f59e0b" strokeWidth="8"
              strokeDasharray={`${(riskProfile.midRiskCount / total) * 377} 377`}
              strokeDashoffset={-1 * (riskProfile.lowRiskCount / total) * 377}
              className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
            />
            <circle
              cx="64" cy="64" r="60" fill="none" stroke="#f85149" strokeWidth="8"
              strokeDasharray={`${(riskProfile.highRiskCount / total) * 377} 377`}
              strokeDashoffset={-1 * ((riskProfile.lowRiskCount + riskProfile.midRiskCount) / total) * 377}
              className="drop-shadow-[0_0_8px_rgba(248,81,73,0.5)]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white drop-shadow-md">{riskProfile.type === 'high_risk' ? 'HIGH' : riskProfile.type === 'moderate' ? 'MID' : 'LOW'}</span>
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">Risk Level</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center text-xs mt-4 pt-4 border-t border-white/5 relative z-10">
        <span className="text-zinc-500 uppercase tracking-widest font-bold text-[10px] flex items-center gap-2"><Tip text="Average price paid per contract in cents. Lower = higher risk, higher potential reward">Avg Entry</Tip> <Activity className="w-3 h-3" /></span>
        <span className="font-mono text-white bg-black/60 px-2.5 py-1 rounded border border-white/10">{riskProfile.avgEntryPrice}c</span>
      </div>
    </div>
  )
}

function PnlAnalysisPanel({ winRate, roi, pnlAnalysis }: { winRate: PersonalityAnalysis['winRate']; roi: PersonalityAnalysis['roi']; pnlAnalysis?: PnlAnalysis }) {
  const pnl = roi.totalRevenue - roi.totalCost
  const pnlFormatted = (pnl / 100).toFixed(2)

  return (
    <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-green/40 transition-all shadow-lg hover:shadow-terminal-green/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-green/5 rounded-full blur-3xl group-hover:bg-terminal-green/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center gap-2 mb-6 relative z-10">
        <span className="text-terminal-green text-xs animate-pulse">●</span>
        <span className="text-white text-xs uppercase tracking-widest font-bold">PnL_Analysis</span>
      </div>

      {/* Profit Factor + Expectancy hero */}
      {pnlAnalysis && (
        <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
          <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5 shadow-inner">
            <div className={`text-2xl font-black font-mono drop-shadow-[0_0_8px_currentColor] ${pnlAnalysis.profitFactor >= 1 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {pnlAnalysis.profitFactor.toFixed(2)}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1"><Tip text="Total winnings divided by total losses. Above 1.0 means you win more than you lose in dollar terms">Profit Factor</Tip></div>
          </div>
          <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5 shadow-inner">
            <div className={`text-2xl font-black font-mono drop-shadow-[0_0_8px_currentColor] ${pnlAnalysis.expectancy >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {pnlAnalysis.expectancy >= 0 ? '+' : ''}{(pnlAnalysis.expectancy / 100).toFixed(2)}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1"><Tip text="Expected profit or loss per trade based on win rate and average win/loss sizes">$/Trade</Tip></div>
          </div>
        </div>
      )}

      {/* Wins / Losses */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5 shadow-inner">
          <div className="text-terminal-green text-xl font-black font-mono drop-shadow-[0_0_8px_rgba(0,255,157,0.3)]">{winRate.wins}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1 flex justify-center items-center gap-1"><Trophy className="w-3 h-3 text-terminal-green opacity-50" /> Wins</div>
        </div>
        <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5 shadow-inner">
          <div className="text-terminal-red text-xl font-black font-mono drop-shadow-[0_0_8px_rgba(255,51,102,0.3)]">{winRate.losses}</div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1 flex justify-center items-center gap-1"><ArrowDownRight className="w-3 h-3 text-terminal-red opacity-50" /> Losses</div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 relative z-10 space-y-2">
        {pnlAnalysis && (
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-500 uppercase tracking-widest font-bold"><Tip text="Largest single market profit and loss from settled positions">Biggest Win / Loss</Tip></span>
            <span className="font-mono">
              <span className="text-terminal-green">+${(pnlAnalysis.biggestWin / 100).toFixed(2)}</span>
              <span className="text-terminal-dim mx-1">/</span>
              <span className="text-terminal-red">-${(pnlAnalysis.biggestLoss / 100).toFixed(2)}</span>
            </span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Net PnL</span>
          <span className={`text-sm font-bold font-mono ${pnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
            {pnl >= 0 ? '+' : ''}${pnlFormatted}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">ROI</span>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded bg-black border ${roi.percentage >= 0 ? 'text-terminal-green border-terminal-green/30' : 'text-terminal-red border-terminal-red/30'}`}>
            {roi.percentage >= 0 ? '+' : ''}{roi.percentage}%
          </span>
        </div>
      </div>
    </div>
  )
}

function TemporalPanel({ temporal }: { temporal?: TemporalAnalysis }) {
  if (!temporal) return null

  const trendConfig = {
    improving: { label: 'IMPROVING', color: 'text-terminal-green', bg: 'bg-terminal-green/10', border: 'border-terminal-green/30', glow: 'shadow-[0_0_15px_rgba(0,255,157,0.1)]' },
    declining: { label: 'DECLINING', color: 'text-terminal-red', bg: 'bg-terminal-red/10', border: 'border-terminal-red/30', glow: 'shadow-[0_0_15px_rgba(248,81,73,0.1)]' },
    stable: { label: 'STABLE', color: 'text-terminal-yellow', bg: 'bg-terminal-yellow/10', border: 'border-terminal-yellow/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' },
  }
  const tc = trendConfig[temporal.trend]

  const maxWR = Math.max(temporal.recentWinRate, temporal.historicalWinRate, 1)

  return (
    <div className={`terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-cyan/40 transition-all shadow-lg hover:shadow-terminal-cyan/10 relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-terminal-cyan/5 rounded-full blur-3xl group-hover:bg-terminal-cyan/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-terminal-cyan text-xs animate-pulse">●</span>
          <span className="text-white text-xs uppercase tracking-widest font-bold">Temporal_Analysis</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tc.color} ${tc.bg} ${tc.border} ${tc.glow}`}>
          {tc.label}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {/* Win Rate Comparison */}
        <div className="space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Win Rate Comparison</div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-terminal-muted">Historical (75%)</span>
                <span className="text-terminal-text font-mono">{temporal.historicalWinRate}%</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-terminal-dim rounded-full transition-all duration-1000" style={{ width: `${(temporal.historicalWinRate / maxWR) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-terminal-muted">Recent (25%)</span>
                <span className={`font-mono ${temporal.recentWinRate >= temporal.historicalWinRate ? 'text-terminal-green' : 'text-terminal-red'}`}>{temporal.recentWinRate}%</span>
              </div>
              <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                <div className={`h-full rounded-full transition-all duration-1000 ${temporal.recentWinRate >= temporal.historicalWinRate ? 'bg-terminal-green' : 'bg-terminal-red'}`} style={{ width: `${(temporal.recentWinRate / maxWR) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ROI Comparison */}
        <div className="space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">ROI Comparison</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5">
              <div className={`text-lg font-black font-mono ${temporal.historicalRoi >= 0 ? 'text-terminal-text' : 'text-terminal-red'}`}>
                {temporal.historicalRoi >= 0 ? '+' : ''}{temporal.historicalRoi}%
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Historical</div>
            </div>
            <div className="bg-black/60 rounded-lg p-3 text-center border border-white/5">
              <div className={`text-lg font-black font-mono ${temporal.recentRoi >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {temporal.recentRoi >= 0 ? '+' : ''}{temporal.recentRoi}%
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">Recent</div>
            </div>
          </div>
        </div>

        {/* Streaks */}
        <div className="space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Streaks</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-black/40 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-[10px] text-terminal-muted uppercase tracking-wider">Current</span>
              <span className={`font-mono text-sm font-bold ${temporal.currentStreak.type === 'win' ? 'text-terminal-green' : 'text-terminal-red'}`}>
                {temporal.currentStreak.type === 'win' ? '🔥' : '🥶'} {temporal.currentStreak.count}{temporal.currentStreak.type === 'win' ? 'W' : 'L'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-black/40 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-[10px] text-terminal-muted uppercase tracking-wider">Best Win Streak</span>
              <span className="font-mono text-sm font-bold text-terminal-green">{temporal.longestWinStreak}W</span>
            </div>
            <div className="flex justify-between items-center bg-black/40 rounded-lg px-3 py-2 border border-white/5">
              <span className="text-[10px] text-terminal-muted uppercase tracking-wider">Worst Loss Streak</span>
              <span className="font-mono text-sm font-bold text-terminal-red">{temporal.longestLossStreak}L</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RadarChartPanel({ scores }: { scores?: PersonalityScores }) {
  if (!scores) return null

  const axes = [
    { key: 'riskAppetite', label: 'RISK', value: (scores.riskAppetite + 100) / 2 }, // -100~+100 → 0~100
    { key: 'diversification', label: 'DIVERSE', value: scores.diversification },
    { key: 'frequency', label: 'FREQ', value: scores.frequency },
    { key: 'skill', label: 'SKILL', value: scores.skill },
    { key: 'trend', label: 'TREND', value: (scores.trend + 100) / 2 }, // -100~+100 → 0~100
    { key: 'conviction', label: 'CONVICT', value: scores.conviction },
  ]

  const cx = 140, cy = 140, R = 100
  const n = axes.length

  const getPoint = (i: number, r: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0]

  // Data polygon
  const dataPoints = axes.map((a, i) => getPoint(i, (a.value / 100) * R))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  // Axis lines
  const axisLines = axes.map((_, i) => getPoint(i, R))

  return (
    <div className="terminal-glass-panel p-6 rounded-xl border border-terminal-border bg-gradient-to-br from-white/[0.02] to-transparent hover:border-terminal-purple/40 transition-all shadow-lg hover:shadow-terminal-purple/10 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-terminal-purple/5 rounded-full blur-3xl group-hover:bg-terminal-purple/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <span className="text-terminal-purple text-xs animate-pulse">●</span>
        <span className="text-white text-xs uppercase tracking-widest font-bold">Personality_Radar</span>
      </div>

      <div className="flex justify-center relative z-10">
        <svg viewBox="0 0 280 280" className="w-full max-w-[280px]">
          {/* Grid rings */}
          {rings.map((r) => {
            const pts = axes.map((_, i) => getPoint(i, r * R))
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
            return <path key={r} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          })}

          {/* Axis lines */}
          {axisLines.map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}

          {/* Data fill */}
          <path d={dataPath} fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.8)" strokeWidth="2" />

          {/* Data points */}
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgba(168,85,247,1)" stroke="#0d1117" strokeWidth="2" className="drop-shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
          ))}

          {/* Labels */}
          {axes.map((a, i) => {
            const lp = getPoint(i, R + 22)
            return (
              <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 text-[9px] font-mono font-bold" style={{ fontSize: '9px' }}>
                {a.label}
              </text>
            )
          })}

          {/* Value labels on points */}
          {axes.map((a, i) => {
            const vp = getPoint(i, (a.value / 100) * R + 14)
            const raw = i === 0 ? scores.riskAppetite : i === 4 ? scores.trend : a.value
            return (
              <text key={`v${i}`} x={vp.x} y={vp.y} textAnchor="middle" dominantBaseline="middle" className="fill-terminal-purple text-[8px] font-mono font-bold" style={{ fontSize: '8px' }}>
                {Math.round(raw)}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Score summary grid */}
      <div className="grid grid-cols-3 gap-2 mt-4 relative z-10">
        {[
          { label: 'Risk Appetite', val: scores.riskAppetite, range: '-100~+100' },
          { label: 'Diversification', val: scores.diversification, range: '0~100' },
          { label: 'Frequency', val: scores.frequency, range: '0~100' },
          { label: 'Skill', val: scores.skill, range: '0~100' },
          { label: 'Trend', val: scores.trend, range: '-100~+100' },
          { label: 'Conviction', val: scores.conviction, range: '0~100' },
        ].map((s) => (
          <div key={s.label} className="bg-black/40 rounded-lg p-2 text-center border border-white/5">
            <div className={`text-sm font-black font-mono ${s.val >= 0 ? 'text-terminal-purple' : 'text-terminal-red'}`}>{s.val > 0 ? '+' : ''}{Math.round(s.val)}</div>
            <div className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecommendationsGrid({ recommendations, profileId, isOwner }: { recommendations: MarketRecommendation[]; profileId: string; isOwner: boolean }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'volume'>('default')

  if (recommendations.length === 0) {
    return (
      <div className="terminal-glass-panel p-8 text-center rounded-xl">
        <span className="text-terminal-dim font-mono">No matching alpha found.</span>
      </div>
    )
  }

  // Extract unique categories
  const categories = Array.from(new Set(recommendations.map(r => r.category).filter(Boolean)))

  // Filter
  let filtered = categoryFilter === 'all' ? recommendations : recommendations.filter(r => r.category === categoryFilter)

  // Sort
  if (sortBy === 'price_asc') {
    filtered = [...filtered].sort((a, b) => parseFloat(a.yesBid.replace('$', '')) - parseFloat(b.yesBid.replace('$', '')))
  } else if (sortBy === 'price_desc') {
    filtered = [...filtered].sort((a, b) => parseFloat(b.yesBid.replace('$', '')) - parseFloat(a.yesBid.replace('$', '')))
  } else if (sortBy === 'volume') {
    filtered = [...filtered].sort((a, b) => parseInt(b.volume24h.replace(/,/g, '')) - parseInt(a.volume24h.replace(/,/g, '')))
  }

  return (
    <div className="space-y-4">
      {/* Filter & Sort Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Category filters */}
        <button
          onClick={() => setCategoryFilter('all')}
          className={`h-7 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
            categoryFilter === 'all'
              ? 'bg-terminal-green/15 text-terminal-green border-terminal-green/40'
              : 'bg-black/30 text-terminal-dim border-white/10 hover:border-white/20 hover:text-terminal-text'
          }`}
        >
          All ({recommendations.length})
        </button>
        {categories.map(cat => {
          const count = recommendations.filter(r => r.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
              className={`h-7 px-3 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                categoryFilter === cat
                  ? 'bg-terminal-cyan/15 text-terminal-cyan border-terminal-cyan/40'
                  : 'bg-black/30 text-terminal-dim border-white/10 hover:border-white/20 hover:text-terminal-text'
              }`}
            >
              {cat} ({count})
            </button>
          )
        })}

        {/* Divider */}
        <div className="h-5 w-px bg-white/10 mx-1" />

        {/* Sort options */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-7 px-2 rounded text-[10px] font-bold uppercase tracking-wider bg-black/60 text-terminal-dim border border-white/10 hover:border-white/20 cursor-pointer focus:outline-none focus:border-terminal-green/40 transition-all"
        >
          <option value="default">Sort: Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="volume">Volume: Highest</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="terminal-glass-panel p-8 text-center rounded-xl">
          <span className="text-terminal-dim font-mono">No markets in this category.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec, i) => (
            <MarketCard key={rec.ticker} recommendation={rec} index={i} profileId={profileId} isOwner={isOwner} />
          ))}
        </div>
      )}
    </div>
  )
}

function MarketCard({ recommendation, index, profileId, isOwner }: { recommendation: MarketRecommendation; index: number; profileId: string; isOwner: boolean }) {
  const [orderMode, setOrderMode] = useState(false)
  const [orderSide, setOrderSide] = useState<'yes' | 'no'>('yes')
  const [orderCount, setOrderCount] = useState(1)
  const [ordering, setOrdering] = useState(false)
  const [orderResult, setOrderResult] = useState<{ success: boolean; message: string } | null>(null)

  const price = parseFloat(recommendation.yesBid.replace('$', '')) || 0
  const priceCents = Math.round(price * 100)
  const priceColor = price < 0.3 ? 'text-terminal-red shadow-red' : price > 0.7 ? 'text-terminal-green shadow-green' : 'text-terminal-yellow shadow-yellow'
  const accentColor = price < 0.3 ? 'border-terminal-red/30' : price > 0.7 ? 'border-terminal-green/30' : 'border-terminal-yellow/30'

  const yesAskPrice = parseFloat(recommendation.yesAsk.replace('$', '')) || 0
  const yesAskCents = Math.round(yesAskPrice * 100)
  const noAskCents = 100 - priceCents // NO ask = 100 - YES bid

  const selectedPrice = orderSide === 'yes' ? yesAskCents : noAskCents
  const totalCost = (selectedPrice * orderCount / 100).toFixed(2)

  const handleOrder = async () => {
    setOrdering(true)
    setOrderResult(null)
    try {
      const result = await executeRecommendOrder(profileId, {
        ticker: recommendation.ticker,
        side: orderSide,
        count: orderCount,
        price: selectedPrice,
      })
      setOrderResult({ success: true, message: `Order placed! ${result.order.count}x ${result.order.side.toUpperCase()} @ ${result.order.price}c` })
      setTimeout(() => { setOrderMode(false); setOrderResult(null) }, 3000)
    } catch (e) {
      setOrderResult({ success: false, message: e instanceof Error ? e.message : 'Order failed' })
    } finally {
      setOrdering(false)
    }
  }

  return (
    <div
      className="terminal-glass-panel p-5 rounded-lg border border-white/5 hover:border-terminal-border-bright transition-all duration-300 opacity-0 animate-fade-in-up hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex-1 min-w-0">
          <Badge variant="outline" className="mb-2 text-[9px] border-terminal-muted/30 text-terminal-muted bg-white/5">
            {recommendation.category || recommendation.ticker}
          </Badge>
          <h3 className="text-xs font-semibold text-terminal-text leading-tight line-clamp-2 group-hover:text-white transition-colors">
            {recommendation.title}
          </h3>
        </div>
        <div className="text-right pl-2">
          <div className={`text-xl font-bold font-mono ${priceColor}`}>
            {recommendation.yesBid}
          </div>
          <div className="text-[9px] text-terminal-dim uppercase tracking-wider text-right">YES PRICE</div>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4 relative z-10">
        <div className={`text-[10px] p-2 rounded bg-black/30 border ${accentColor} text-terminal-text/80 leading-relaxed font-mono`}>
          "{recommendation.reason}"
        </div>
      </div>

      {/* Order Panel */}
      {orderMode ? (
        <div className="relative z-10 space-y-3">
          {/* Side toggle */}
          <div className="flex gap-1">
            <button
              onClick={() => setOrderSide('yes')}
              className={`flex-1 h-8 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                orderSide === 'yes'
                  ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/50 shadow-[0_0_10px_rgba(0,255,157,0.15)]'
                  : 'bg-black/30 text-terminal-dim border-white/10 hover:border-white/20'
              }`}
            >
              Buy YES
            </button>
            <button
              onClick={() => setOrderSide('no')}
              className={`flex-1 h-8 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                orderSide === 'no'
                  ? 'bg-terminal-red/20 text-terminal-red border-terminal-red/50 shadow-[0_0_10px_rgba(248,81,73,0.15)]'
                  : 'bg-black/30 text-terminal-dim border-white/10 hover:border-white/20'
              }`}
            >
              Buy NO
            </button>
          </div>

          {/* Quantity + Price */}
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-1 bg-black/60 rounded border border-white/10 px-2 h-8">
              <button onClick={() => setOrderCount(Math.max(1, orderCount - 1))} className="text-terminal-dim hover:text-white text-xs px-1">-</button>
              <span className="text-white text-xs font-mono w-6 text-center">{orderCount}</span>
              <button onClick={() => setOrderCount(orderCount + 1)} className="text-terminal-dim hover:text-white text-xs px-1">+</button>
            </div>
            <div className="text-[10px] text-terminal-dim font-mono">
              @ {selectedPrice}c
            </div>
            <div className="flex-1 text-right">
              <span className="text-[10px] text-terminal-muted font-mono">Total: </span>
              <span className="text-xs text-white font-bold font-mono">${totalCost}</span>
            </div>
          </div>

          {/* Execute + Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleOrder}
              disabled={ordering}
              className={`flex-1 h-8 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${
                orderSide === 'yes'
                  ? 'bg-terminal-green/20 hover:bg-terminal-green/30 text-terminal-green border-terminal-green/40'
                  : 'bg-terminal-red/20 hover:bg-terminal-red/30 text-terminal-red border-terminal-red/40'
              } disabled:opacity-40`}
            >
              {ordering ? 'PLACING...' : `CONFIRM ${orderSide.toUpperCase()}`}
            </button>
            <button
              onClick={() => { setOrderMode(false); setOrderResult(null) }}
              className="h-8 px-3 rounded text-[10px] font-bold text-terminal-dim border border-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              CANCEL
            </button>
          </div>

          {/* Result */}
          {orderResult && (
            <div className={`text-[10px] font-mono p-2 rounded border ${
              orderResult.success
                ? 'text-terminal-green border-terminal-green/30 bg-terminal-green/5'
                : 'text-terminal-red border-terminal-red/30 bg-terminal-red/5'
            }`}>
              {orderResult.message}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2 relative z-10">
          {isOwner ? (
            <Button
              onClick={() => setOrderMode(true)}
              className="w-full h-8 bg-terminal-green/10 hover:bg-terminal-green/20 text-terminal-green border border-terminal-green/30 hover:border-terminal-green/50 text-[10px] uppercase font-bold tracking-wider transition-all"
            >
              Quick Order
            </Button>
          ) : (
            <a href={recommendation.kalshiUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full h-8 bg-terminal-text/5 hover:bg-terminal-green/20 text-terminal-text hover:text-terminal-green border border-terminal-text/10 hover:border-terminal-green/50 text-[10px] uppercase font-bold tracking-wider transition-all">
                View on Kalshi
              </Button>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
