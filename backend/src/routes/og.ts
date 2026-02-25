import { Hono } from 'hono'
import { getProfileByUsername, getProfile } from '../db'

export const ogRoute = new Hono()

// Generate OG image as SVG
ogRoute.get('/:username', (c) => {
  const identifier = c.req.param('username')

  // Resolve profile
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  const profile = isUUID ? getProfile(identifier) : getProfileByUsername(identifier)

  if (!profile || !profile.analysis_cache) {
    // Fallback generic card
    return c.body(generateSVG({
      username: identifier,
      tagName: 'Unknown Trader',
      tagEmoji: '?',
      winRate: '--',
      roi: '--',
      totalTrades: '--',
      profitFactor: '--',
    }), 200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    })
  }

  const analysis = JSON.parse(profile.analysis_cache)

  return c.body(generateSVG({
    username: profile.username || identifier,
    tagName: analysis.tag?.name || 'Trader',
    tagEmoji: analysis.tag?.emoji || '',
    winRate: `${analysis.winRate?.percentage ?? '--'}%`,
    roi: `${analysis.roi?.percentage >= 0 ? '+' : ''}${analysis.roi?.percentage ?? '--'}%`,
    totalTrades: `${analysis.frequency?.totalTrades ?? '--'}`,
    profitFactor: analysis.pnlAnalysis?.profitFactor?.toFixed(2) ?? '--',
    traits: analysis.traits?.slice(0, 3) || [],
  }), 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=300',
  })
})

// Generate OG HTML page with meta tags for social crawlers
ogRoute.get('/:username/meta', (c) => {
  const identifier = c.req.param('username')
  const isUUID = /^[a-f0-9-]{36}$/i.test(identifier)
  const profile = isUUID ? getProfile(identifier) : getProfileByUsername(identifier)

  let title = `${identifier}'s Trading Personality`
  let description = 'Discover your Kalshi trading personality with Shield & Scout'
  const ogImageUrl = `${c.req.url.replace('/meta', '')}`
  const profileUrl = `http://localhost:5173/scout/${identifier}`

  if (profile?.analysis_cache) {
    const analysis = JSON.parse(profile.analysis_cache)
    const name = profile.username || identifier
    title = `${name} is a "${analysis.tag?.name} ${analysis.tag?.emoji}" on Kalshi`
    description = `Win Rate: ${analysis.winRate?.percentage}% | ROI: ${analysis.roi?.percentage >= 0 ? '+' : ''}${analysis.roi?.percentage}% | ${analysis.frequency?.totalTrades} trades`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImageUrl}" />
  <meta http-equiv="refresh" content="0;url=${profileUrl}" />
</head>
<body>
  <p>Redirecting to <a href="${profileUrl}">${escapeHtml(title)}</a>...</p>
</body>
</html>`

  return c.html(html)
})

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

interface OGData {
  username: string
  tagName: string
  tagEmoji: string
  winRate: string
  roi: string
  totalTrades: string
  profitFactor: string
  traits?: { name: string; emoji: string }[]
}

function generateSVG(data: OGData): string {
  const roiColor = data.roi.startsWith('+') ? '#00ff9d' : data.roi.startsWith('-') ? '#f85149' : '#8b949e'
  const wrNum = parseFloat(data.winRate)
  const wrColor = isNaN(wrNum) ? '#8b949e' : wrNum >= 50 ? '#00ff9d' : '#f85149'

  const traitBadges = (data.traits || []).map((t, i) =>
    `<text x="${400 + i * 150}" y="435" font-family="monospace" font-size="16" fill="#c9d1d9">${t.emoji} ${t.name}</text>`
  ).join('\n    ')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117" />
      <stop offset="50%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00ff9d" />
      <stop offset="50%" stop-color="#00f0ff" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <rect width="40" height="40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)" />

  <!-- Top accent line -->
  <rect x="0" y="0" width="1200" height="3" fill="url(#accent)" opacity="0.7" />

  <!-- Border -->
  <rect x="30" y="30" width="1140" height="570" rx="16" ry="16" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

  <!-- Logo area -->
  <text x="70" y="85" font-family="monospace" font-size="14" fill="#484f58" font-weight="bold" letter-spacing="3">SHIELD &amp; SCOUT</text>

  <!-- Emoji -->
  <text x="70" y="220" font-size="80">${data.tagEmoji}</text>

  <!-- Tag name -->
  <text x="180" y="195" font-family="monospace" font-size="14" fill="#484f58" font-weight="bold" letter-spacing="4">TRADER_IDENTITY</text>
  <text x="180" y="240" font-family="monospace" font-size="48" fill="#ffffff" font-weight="900" letter-spacing="2">${escapeHtml(data.tagName)}</text>

  <!-- Username -->
  <text x="180" y="280" font-family="monospace" font-size="20" fill="#00f0ff" font-weight="bold" letter-spacing="2">@${escapeHtml(data.username)}</text>

  <!-- Divider -->
  <line x1="70" y1="320" x2="1130" y2="320" stroke="rgba(255,255,255,0.08)" stroke-width="1" />

  <!-- Stats -->
  <text x="120" y="370" font-family="monospace" font-size="12" fill="#484f58" font-weight="bold" letter-spacing="3" text-anchor="middle">WIN RATE</text>
  <text x="120" y="405" font-family="monospace" font-size="36" fill="${wrColor}" font-weight="900" text-anchor="middle">${escapeHtml(data.winRate)}</text>

  <text x="340" y="370" font-family="monospace" font-size="12" fill="#484f58" font-weight="bold" letter-spacing="3" text-anchor="middle">NET ROI</text>
  <text x="340" y="405" font-family="monospace" font-size="36" fill="${roiColor}" font-weight="900" text-anchor="middle">${escapeHtml(data.roi)}</text>

  <text x="560" y="370" font-family="monospace" font-size="12" fill="#484f58" font-weight="bold" letter-spacing="3" text-anchor="middle">TRADES</text>
  <text x="560" y="405" font-family="monospace" font-size="36" fill="#58a6ff" font-weight="900" text-anchor="middle">${escapeHtml(data.totalTrades)}</text>

  <text x="780" y="370" font-family="monospace" font-size="12" fill="#484f58" font-weight="bold" letter-spacing="3" text-anchor="middle">PROFIT FACTOR</text>
  <text x="780" y="405" font-family="monospace" font-size="36" fill="#a855f7" font-weight="900" text-anchor="middle">${escapeHtml(data.profitFactor)}</text>

  <!-- Trait badges -->
  ${traitBadges}

  <!-- Bottom branding -->
  <text x="70" y="580" font-family="monospace" font-size="13" fill="#484f58" letter-spacing="2">Discover your trading personality at shieldandscout.com</text>
  <rect x="950" y="555" width="180" height="35" rx="6" ry="6" fill="rgba(0,255,157,0.1)" stroke="rgba(0,255,157,0.3)" stroke-width="1" />
  <text x="1040" y="578" font-family="monospace" font-size="12" fill="#00ff9d" font-weight="bold" letter-spacing="2" text-anchor="middle">ANALYZE ME</text>
</svg>`
}
