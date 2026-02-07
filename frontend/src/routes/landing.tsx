import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { connectKalshi } from '@/lib/api'

export function LandingPage() {
  const navigate = useNavigate()
  const [apiKeyId, setApiKeyId] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [fileError, setFileError] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [typedText, setTypedText] = useState('')

  const fullText = 'Discover your trading personality_'

  useEffect(() => {
    let i = 0
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1))
        i++
      } else {
        clearInterval(typeInterval)
      }
    }, 50)

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
    }
  }, [])

  const connectMutation = useMutation({
    mutationFn: () => connectKalshi(apiKeyId, privateKey),
    onSuccess: (data) => {
      navigate({ to: '/profile/$profileId', params: { profileId: data.profileId } })
    },
  })

  const validatePemContent = (content: string): boolean => {
    const trimmed = content.trim()
    const validHeaders = [
      '-----BEGIN RSA PRIVATE KEY-----',
      '-----BEGIN PRIVATE KEY-----',
      '-----BEGIN EC PRIVATE KEY-----',
    ]
    const validFooters = [
      '-----END RSA PRIVATE KEY-----',
      '-----END PRIVATE KEY-----',
      '-----END EC PRIVATE KEY-----',
    ]

    const hasValidHeader = validHeaders.some(h => trimmed.startsWith(h))
    const hasValidFooter = validFooters.some(f => trimmed.endsWith(f))

    return hasValidHeader && hasValidFooter
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setFileError('')

    if (!file) return

    if (file.size > 10 * 1024) {
      setFileError('ERR: File exceeds 10KB limit')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string

      if (!validatePemContent(content)) {
        setFileError('ERR: Invalid PEM format')
        e.target.value = ''
        return
      }

      setPrivateKey(content)
    }
    reader.onerror = () => {
      setFileError('ERR: Failed to read file')
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-terminal grid-bg relative overflow-hidden flex flex-col">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent h-[2px] animate-[scanline_8s_linear_infinite]" />
      </div>

      {/* Header bar */}
      <header className="border-b border-terminal/50 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f85149] shadow-[0_0_10px_rgba(248,81,73,0.5)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#d29922] shadow-[0_0_10px_rgba(210,153,34,0.5)]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#3fb950] shadow-[0_0_10px_rgba(63,185,80,0.5)]" />
          </div>
          <span className="text-terminal-muted text-[10px] tracking-widest uppercase font-medium">kalshi-personality v2.0.0</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider">
          <span className="text-terminal-dim">SYSTEM: <span className="text-terminal-text">ONLINE</span></span>
          <span className="text-terminal-green animate-pulse">● NET_SECURE</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-xl space-y-8">
          {/* Logo Section */}
          <div className="text-center opacity-0 animate-fade-in-up">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-glow hover-glitch cursor-default transition-all duration-300">
              <span className="text-terminal-green">KALSHI</span>
              <span className="text-terminal-muted opacity-50">_ANALYZER</span>
            </h1>
            
            {/* Typewriter text */}
            <div className="mt-4 h-6">
              <p className="text-terminal-cyan text-sm font-mono tracking-wide inline-block border-r-2 border-terminal-green pr-1">
                {typedText}
              </p>
            </div>
          </div>

          {/* Main Terminal Card */}
          <div className="terminal-panel terminal-glow p-1 rounded-lg opacity-0 animate-fade-in-up stagger-2 transform transition-all hover:scale-[1.01]">
            <div className="bg-terminal-bg/90 backdrop-blur-xl rounded p-6 md:p-8 space-y-8 border border-white/5">
              
              <div className="flex items-center justify-between border-b border-terminal/50 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-terminal-green/10 rounded">
                      <span className="text-terminal-green text-lg">$</span>
                    </div>
                    <span className="text-terminal-text font-mono text-sm tracking-wide">
                      initiate_sequence <span className="text-terminal-dim">--auth</span>
                    </span>
                 </div>
                 <div className="text-[10px] text-terminal-dim font-mono">ID: 884-XJ-99</div>
              </div>

              <div className="space-y-6">
                {/* API Key Input */}
                <div className="space-y-2 group">
                  <Label className="text-terminal-muted text-[10px] uppercase tracking-widest flex items-center gap-2 group-focus-within:text-terminal-green transition-colors">
                    <span className="text-terminal-blue">01</span> API_KEY_ID
                  </Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={apiKeyId}
                    onChange={(e) => setApiKeyId(e.target.value)}
                    className="h-12 bg-black/20 border-terminal/50 text-terminal-green font-mono text-sm placeholder:text-terminal-dim/50 focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 transition-all rounded"
                  />
                </div>

                {/* Private Key Input */}
                <div className="space-y-2 group">
                  <Label className="text-terminal-muted text-[10px] uppercase tracking-widest flex items-center gap-2 group-focus-within:text-terminal-green transition-colors">
                    <span className="text-terminal-blue">02</span> CLIENT_KEY
                  </Label>
                  
                  <div className="relative">
                    {!privateKey ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-terminal/50 rounded hover:border-terminal-green hover:bg-terminal-green/5 transition-all cursor-pointer group/drop">
                        <input
                          type="file"
                          accept=".pem,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2 text-terminal-muted group-hover/drop:text-terminal-green transition-colors">
                          <span className="text-2xl">⚡</span>
                          <span className="text-xs tracking-wider">DROP PEM FILE OR CLICK</span>
                        </div>
                      </label>
                    ) : (
                      <div className="relative w-full h-32">
                         <textarea
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          className="w-full h-full px-4 py-3 text-[10px] leading-relaxed rounded bg-black/40 border border-terminal-green/30 text-terminal-green/80 resize-none font-mono focus:border-terminal-green focus:outline-none focus:ring-1 focus:ring-terminal-green/20"
                        />
                        <button 
                          onClick={() => setPrivateKey('')}
                          className="absolute top-2 right-2 text-terminal-red hover:text-white bg-black/50 hover:bg-terminal-red py-1 px-2 text-[10px] rounded transition-colors"
                        >
                          CLEAR
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {fileError && (
                    <div className="flex items-center gap-2 text-terminal-red text-xs animate-pulse">
                      <span>⚠</span> {fileError}
                    </div>
                  )}
                </div>

                {/* Status Message */}
                <div className="h-6">
                  {connectMutation.error && (
                    <div className="flex items-center gap-2 text-terminal-red text-xs bg-terminal-red/5 p-2 rounded border border-terminal-red/20">
                      <span>RUNTIME_ERROR:</span>
                      <span className="font-mono">{connectMutation.error.message}</span>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={!apiKeyId || !privateKey || connectMutation.isPending}
                  className="w-full h-12 bg-terminal-green hover:bg-terminal-green-dim text-black font-bold tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(63,185,80,0.3)] hover:shadow-[0_0_30px_rgba(63,185,80,0.5)] active:scale-[0.98]"
                >
                  {connectMutation.isPending ? (
                    <span className="flex items-center gap-3">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                       ESTABLISH UPLINK <span className="text-lg">›</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Instructions Footer */}
          <div className="grid grid-cols-2 gap-4 text-[10px] text-terminal-dim opacity-0 animate-fade-in-up stagger-3">
             <div className="border-l border-terminal/30 pl-3">
                <span className="text-terminal-muted block mb-1 font-bold">CREDENTIALS</span>
                <span>Keys are processed locally in memory. No server transmission.</span>
             </div>
             <div className="border-l border-terminal/30 pl-3">
                <span className="text-terminal-muted block mb-1 font-bold">DEMO ACCESS</span>
                <a href="https://demo.kalshi.co/account/profile" target="_blank" rel="noopener noreferrer" className="text-terminal-cyan hover:text-terminal-green transition-colors hover:underline">
                  Generate keys at demo.kalshi.co →
                </a>
             </div>
          </div>

        </div>
      </main>
      
      {/* Background decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-terminal-green/5 to-transparent pointer-events-none" />
    </div>
  )
}
