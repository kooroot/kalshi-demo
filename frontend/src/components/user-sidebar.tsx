import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Input } from '@/components/ui/input'
import { searchProfiles, type SearchResult } from '@/lib/api'

interface UserSidebarProps {
  open: boolean
  onClose: () => void
  username: string
  profileId?: string
  isOwner?: boolean
  balanceDollars?: string
}

export function UserSidebar({ open, onClose, username, balanceDollars }: UserSidebarProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return
    setSearching(true)
    setNotFound(false)
    setResults([])
    try {
      const data = await searchProfiles(query.trim())
      if (data.found && data.results.length > 0) {
        setResults(data.results)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    } finally {
      setSearching(false)
    }
  }

  const goToProfile = (target: string) => {
    onClose()
    navigate({ to: '/scout/$username', params: { username: target } })
  }

  const disconnect = () => {
    onClose()
    navigate({ to: '/' })
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-terminal-bg/95 backdrop-blur-xl border-l border-terminal-border z-[70] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-terminal-dim font-mono uppercase tracking-widest">Account</span>
            <button
              onClick={onClose}
              className="text-terminal-dim hover:text-white transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-terminal-blue/20 to-terminal-green/20 border border-white/10 flex items-center justify-center">
              <span className="text-terminal-green text-sm font-black">{username[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-terminal-text text-sm font-bold tracking-wider truncate">
                {/^[a-f0-9-]{36}$/i.test(username) ? `${username.slice(0, 8)}...` : username}
              </div>
              {balanceDollars && (
                <div className="text-terminal-green text-xs font-mono">${balanceDollars}</div>
              )}
            </div>
            <div className="w-2 h-2 rounded-full bg-terminal-green shadow-[0_0_8px_rgba(0,255,157,0.6)]" />
          </div>
        </div>

        {/* Search */}
        <div className="p-5 border-b border-white/5 space-y-3">
          <div className="text-[10px] text-terminal-dim font-mono uppercase tracking-widest">Search Profiles</div>
          <div className="flex gap-2">
            <Input
              placeholder="Username..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setNotFound(false)
                setResults([])
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-9 bg-black/60 border-terminal/50 text-white placeholder:text-zinc-600 focus:border-terminal-purple focus:ring-1 focus:ring-terminal-purple/50 rounded font-mono text-xs tracking-wider"
            />
            <button
              onClick={handleSearch}
              disabled={!query.trim() || searching}
              className="h-9 px-3 rounded border border-terminal-purple/40 bg-terminal-purple/10 text-terminal-purple text-[10px] font-bold uppercase tracking-wider hover:bg-terminal-purple/20 transition-colors disabled:opacity-30"
            >
              {searching ? '...' : 'GO'}
            </button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button
                  key={r.profileId || `kalshi-${i}`}
                  onClick={() => goToProfile(r.username)}
                  className="w-full text-left px-3 py-2.5 bg-black/30 hover:bg-terminal-purple/10 border border-white/5 hover:border-terminal-purple/30 rounded transition-all flex items-center gap-2.5 group"
                >
                  <div className={`w-6 h-6 rounded border flex items-center justify-center text-[10px] font-bold transition-colors ${
                    r.source === 'kalshi'
                      ? 'bg-terminal-green/10 border-terminal-green/30 text-terminal-green group-hover:text-terminal-green'
                      : 'bg-white/5 border-white/10 text-terminal-dim group-hover:text-terminal-purple'
                  }`}>
                    {r.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-terminal-text group-hover:text-white transition-colors truncate block">
                      {r.username}
                    </span>
                    {r.source === 'kalshi' && (
                      <span className="text-[9px] text-terminal-green/70 font-mono">Kalshi Public Profile</span>
                    )}
                  </div>
                  <svg className="w-3 h-3 text-terminal-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {notFound && (
            <div className="text-terminal-dim text-[11px] font-mono text-center py-2">
              No results for "{query}"
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="p-5 border-t border-white/5">
          <button
            onClick={disconnect}
            className="w-full text-left px-4 py-3 rounded-lg text-xs font-mono tracking-wider text-terminal-red/60 hover:text-terminal-red bg-transparent hover:bg-terminal-red/5 transition-colors flex items-center gap-3 border border-transparent hover:border-terminal-red/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
            </svg>
            DISCONNECT
          </button>
        </div>
      </div>
    </>
  )
}
