import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectKalshi, searchProfiles, type SearchResult } from "@/lib/api";
import { Shield, Key, FileKey, Activity, Terminal, ArrowRight, UploadCloud, Search, User } from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const [apiKeyId, setApiKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [fileError, setFileError] = useState("");
  const [typedText, setTypedText] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchNotFound, setSearchNotFound] = useState(false);

  const fullText = "Protect your portfolio, discover new alpha_";

  useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setTypedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 50);

    return () => {
      clearInterval(typeInterval);
    };
  }, []);

  const connectMutation = useMutation({
    mutationFn: () => connectKalshi(apiKeyId, privateKey),
    onSuccess: (data) => {
      const target = data.username || data.profileId;
      navigate({
        to: "/scout/$username",
        params: { username: target },
      });
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setIsSearching(true);
    setSearchNotFound(false);
    setSearchResults([]);
    try {
      const data = await searchProfiles(searchQuery.trim());
      if (data.found && data.results.length > 0) {
        // If exact match (single result), navigate directly
        if (data.results.length === 1) {
          navigate({
            to: "/scout/$username",
            params: { username: data.results[0].username },
          });
          return;
        }
        setSearchResults(data.results);
      } else {
        setSearchNotFound(true);
      }
    } catch {
      setSearchNotFound(true);
    } finally {
      setIsSearching(false);
    }
  };

  const validatePemContent = (content: string): boolean => {
    const trimmed = content.trim();
    const validHeaders = [
      "-----BEGIN RSA PRIVATE KEY-----",
      "-----BEGIN PRIVATE KEY-----",
      "-----BEGIN EC PRIVATE KEY-----",
    ];
    const validFooters = [
      "-----END RSA PRIVATE KEY-----",
      "-----END PRIVATE KEY-----",
      "-----END EC PRIVATE KEY-----",
    ];

    const hasValidHeader = validHeaders.some((h) => trimmed.startsWith(h));
    const hasValidFooter = validFooters.some((f) => trimmed.endsWith(f));

    return hasValidHeader && hasValidFooter;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (!file) return;

    if (file.size > 10 * 1024) {
      setFileError("ERR: File exceeds 10KB limit");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      if (!validatePemContent(content)) {
        setFileError("ERR: Invalid PEM format");
        e.target.value = "";
        return;
      }

      setPrivateKey(content);
    };
    reader.onerror = () => {
      setFileError("ERR: Failed to read file");
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-terminal grid-bg relative overflow-hidden flex flex-col items-center">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Scanline effect */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-50">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-terminal-blue/20 to-transparent h-[2px] animate-[scanline_8s_linear_infinite]" />
      </div>

      {/* Header bar */}
      <header className="fixed top-0 w-full border-b border-terminal/50 bg-terminal-bg/50 backdrop-blur-xl px-4 md:px-8 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-terminal-red shadow-[0_0_10px_rgba(255,51,102,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-terminal-orange shadow-[0_0_10px_rgba(255,153,51,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-terminal-green shadow-[0_0_10px_rgba(0,255,157,0.5)]" />
          </div>
          <span className="text-terminal-muted text-[10px] md:text-xs tracking-widest uppercase font-mono font-bold hidden md:inline-block">
            kalshi-shield-scout v2.0.0
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] md:text-xs font-mono tracking-wider">
          <span className="text-terminal-dim">
            SYSTEM: <span className="text-terminal-text">ONLINE</span>
          </span>
          <span className="text-terminal-blue animate-pulse-blue border border-terminal-blue/40 px-2 py-0.5 rounded text-[9px]">
            UPLINK_STANDBY
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 w-full relative z-10 mt-16 md:mt-24 mb-10">
        <div className="w-full max-w-xl space-y-10">
          {/* Logo Section */}
          <div className="text-center opacity-0 animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter hover-glitch cursor-default transition-all duration-300 drop-shadow-2xl">
              <span className="text-terminal-blue text-glow">SHIELD</span>
              <span className="text-terminal-dim opacity-50 px-2 font-light text-4xl">
                &
              </span>
              <span className="text-terminal-green text-glow">SCOUT</span>
            </h1>

            {/* Typewriter text */}
            <div className="mt-6 h-6">
              <p className="text-terminal-cyan text-xs md:text-sm font-mono tracking-widest inline-block border-r-2 border-terminal-green pr-1 animate-blink">
                {typedText}
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="terminal-panel p-[1px] rounded-xl opacity-0 animate-fade-in-up stagger-1 bg-gradient-to-r from-terminal-purple/30 via-transparent to-terminal-cyan/30">
            <div className="bg-terminal-bg/95 backdrop-blur-3xl rounded-xl p-5 md:p-6 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-terminal-purple" />
                <span className="text-terminal-muted text-[11px] font-bold uppercase tracking-widest">
                  Find_Trader
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search username..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchNotFound(false);
                      setSearchResults([]);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-12 bg-black/80 border-terminal/60 text-white placeholder:text-zinc-600 focus:border-terminal-purple focus:ring-1 focus:ring-terminal-purple/50 rounded-lg pl-4 pr-4 font-mono text-sm tracking-widest shadow-inner transition-all hover:bg-black"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching}
                  className="h-12 px-6 bg-terminal-purple/20 hover:bg-terminal-purple/30 text-terminal-purple border border-terminal-purple/40 hover:border-terminal-purple/60 text-xs uppercase tracking-widest font-bold transition-all disabled:opacity-40"
                >
                  {isSearching ? "..." : "Search"}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-3 space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.profileId}
                      onClick={() =>
                        navigate({
                          to: "/scout/$username",
                          params: { username: result.username },
                        })
                      }
                      className="w-full text-left px-4 py-3 bg-black/40 hover:bg-terminal-purple/10 border border-white/5 hover:border-terminal-purple/30 rounded-lg transition-all flex items-center gap-3 group"
                    >
                      <User className="w-4 h-4 text-terminal-dim group-hover:text-terminal-purple transition-colors" />
                      <span className="font-mono text-sm text-terminal-text group-hover:text-white transition-colors">
                        {result.username}
                      </span>
                      <ArrowRight className="w-3 h-3 text-terminal-dim ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}

              {searchNotFound && (
                <div className="mt-3 text-center text-terminal-dim text-xs font-mono py-2">
                  No traders found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>

          {/* Main Terminal Card */}
          <div className="terminal-panel terminal-glow p-[1px] rounded-xl opacity-0 animate-fade-in-up stagger-2 transform transition-all hover:scale-[1.01] bg-gradient-to-br from-terminal-blue/30 via-transparent to-terminal-green/30">
            <div className="bg-terminal-bg/95 backdrop-blur-3xl rounded-xl p-6 md:p-10 space-y-8 border border-white/5 relative overflow-hidden">
              {/* Decorative corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-terminal-blue/50 rounded-tl-xl m-2" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-terminal-green/50 rounded-br-xl m-2" />

              <div className="flex items-center justify-between border-b border-terminal/50 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-1 min-w-6 flex justify-center bg-terminal-blue/20 rounded-sm border border-terminal-blue/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    <span className="text-terminal-blue text-sm">~</span>
                  </div>
                  <span className="text-terminal-text font-mono text-sm tracking-widest">
                    deploy_protocol{" "}
                    <span className="text-terminal-dim">--init</span>
                  </span>
                </div>
                <div className="text-[10px] text-terminal-dim font-mono tracking-widest uppercase">
                  TERM_ID: 884-XJ
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                {/* API Key Input */}
                <div className="space-y-3 group">
                  <Label className="text-terminal-muted text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 group-focus-within:text-white transition-colors">
                    <span className="text-terminal-blue bg-terminal-blue/10 px-1.5 py-0.5 rounded shadow-sm border border-terminal-blue/20">
                      01
                    </span>{" "}
                    PUBLIC_KEY
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-terminal-muted group-focus-within:text-terminal-blue transition-colors">
                      <Key className="w-4 h-4" />
                    </div>
                    <Input
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={apiKeyId}
                      onChange={(e) => setApiKeyId(e.target.value)}
                      className="h-14 bg-black/80 border-terminal/60 text-white placeholder:text-zinc-600 focus:border-terminal-blue focus:ring-1 focus:ring-terminal-blue/50 rounded-lg pl-10 pr-4 font-mono text-sm tracking-widest shadow-inner transition-all hover:bg-black"
                    />
                  </div>
                </div>

                {/* Private Key Input */}
                <div className="space-y-3 group">
                  <div className="text-terminal-muted text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 group-focus-within:text-white transition-colors select-none">
                    <span className="text-terminal-green bg-terminal-green/10 px-1.5 py-0.5 rounded shadow-sm border border-terminal-green/20">
                      02
                    </span>{" "}
                    PRIVATE_CERT
                  </div>

                  <div className="relative rounded-lg overflow-hidden border border-terminal/60 group-focus-within:border-terminal-green transition-colors bg-black/80">
                    {!privateKey ? (
                      <label className="flex flex-col items-center justify-center w-full h-36 border-dashed border-terminal/50 hover:border-terminal-green/50 hover:bg-terminal-green/5 transition-all cursor-pointer relative group/drop">
                        <input
                          type="file"
                          accept=".pem,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,157,0.05)_0%,transparent_70%)] opacity-0 group-hover/drop:opacity-100 transition-opacity" />
                        <div className="flex flex-col items-center gap-4 text-zinc-500 group-hover/drop:text-terminal-green transition-colors z-10">
                          <UploadCloud className="w-8 h-8 opacity-70 group-hover/drop:opacity-100 group-hover/drop:animate-bounce" />
                          <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
                            Drop .pem configuration
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div className="relative w-full h-36 flex group/textarea">
                        <div className="w-10 bg-black border-r border-terminal/30 flex flex-col items-center py-3 text-terminal-green/50">
                          <FileKey className="w-4 h-4 mb-2 opacity-50" />
                          <div className="w-px h-full bg-terminal-green/10" />
                        </div>
                        <textarea
                          value={privateKey}
                          onChange={(e) => setPrivateKey(e.target.value)}
                          className="w-full h-full px-4 py-3 text-[11px] leading-relaxed bg-transparent text-emerald-400 resize-none font-mono focus:outline-none placeholder:text-zinc-600 transition-colors"
                          placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                        />
                        <button
                          onClick={() => setPrivateKey("")}
                          className="absolute top-3 right-3 text-red-400/70 hover:text-red-400 bg-red-400/10 hover:bg-red-400/20 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase transition-colors border border-red-400/30 shadow-md backdrop-blur opacity-0 group-hover/textarea:opacity-100"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {fileError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs px-2 animate-pulse font-mono bg-red-400/10 py-2 rounded border border-red-400/20">
                    <Terminal className="w-3 h-3" /> {fileError}
                  </div>
                )}

                {/* Status Message */}
                <div className="h-4">
                  {connectMutation.error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs text-center justify-center">
                      <span className="font-bold">ERR:</span>
                      <span className="font-mono">
                        {connectMutation.error.message}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <Button
                  onClick={() => connectMutation.mutate()}
                  disabled={
                    !apiKeyId || !privateKey || connectMutation.isPending
                  }
                  className="w-full h-14 bg-terminal-blue hover:bg-[#00d8e6] text-black font-black tracking-[0.2em] rounded-lg text-sm transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] active:scale-[0.99] mt-2 border border-terminal-blue/50 uppercase disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700/50 disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-100 flex items-center justify-center gap-2 group"
                >
                  {connectMutation.isPending ? (
                    <>
                      <Terminal className="w-5 h-5 animate-pulse" />
                      INITIALIZING...
                    </>
                  ) : (
                    <>
                      EXECUTE UPLINK <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* System Module Manifest (Onboarding) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 opacity-0 animate-fade-in-up stagger-3">
            <div className="border border-terminal-green/30 bg-black/80 backdrop-blur-md p-5 rounded-lg relative overflow-hidden group hover:border-terminal-green/60 transition-colors shadow-lg shadow-black/50 hover:shadow-terminal-green/10">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-terminal-green/10 rounded-full blur-3xl group-hover:bg-terminal-green/20 transition-all duration-700" />
              <div className="flex items-start gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-terminal-green/10 rounded-md border border-terminal-green/20">
                  <Activity className="w-5 h-5 text-terminal-green" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                    Scout_Engine
                    <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse-green shadow-[0_0_8px_rgba(0,255,157,0.8)]"></span>
                  </h3>
                  <div className="text-[10px] text-terminal-green/70 font-mono tracking-widest mt-0.5">ANALYSIS_NODE</div>
                </div>
              </div>
              <p className="text-zinc-400 text-xs font-mono leading-relaxed relative z-10">
                Analyzes your <span className="text-white font-bold bg-white/10 px-1 py-0.5 rounded">Kalshi trading history</span> using AI to classify your trading personality and match you with high-yield <span className="text-terminal-green font-bold bg-terminal-green/10 px-1 py-0.5 rounded">Kalshi</span> prediction markets.
              </p>
            </div>

            <div className="border border-terminal-blue/30 bg-black/80 backdrop-blur-md p-5 rounded-lg relative overflow-hidden group hover:border-terminal-blue/60 transition-colors shadow-lg shadow-black/50 hover:shadow-terminal-blue/10">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-terminal-blue/10 rounded-full blur-3xl group-hover:bg-terminal-blue/20 transition-all duration-700" />
              <div className="flex items-start gap-4 mb-3 relative z-10">
                <div className="p-2.5 bg-terminal-blue/10 rounded-md border border-terminal-blue/20">
                  <Shield className="w-5 h-5 text-terminal-blue" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm tracking-widest uppercase flex items-center gap-2">
                    Shield_Protocol
                    <span className="w-1.5 h-1.5 rounded-full bg-terminal-blue animate-pulse-blue shadow-[0_0_8px_rgba(0,240,255,0.8)]"></span>
                  </h3>
                  <div className="text-[10px] text-terminal-blue/70 font-mono tracking-widest mt-0.5">DEFENSE_SYSTEM</div>
                </div>
              </div>
              <p className="text-zinc-400 text-xs font-mono leading-relaxed relative z-10">
                Deploys active portfolio hedging. Instantly identifies risky <span className="text-white font-bold border-b border-zinc-700">Concentration</span> and calculates automated defensive positions.
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <a
              href="https://demo.kalshi.co/account/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="group text-[10px] text-zinc-500 hover:text-terminal-green transition-colors font-mono tracking-widest uppercase inline-flex items-center gap-2"
            >
              [ Need test credentials? GET DEMO KEYS ]
              <Terminal className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-terminal-green/5 to-transparent pointer-events-none" />
    </div>
  );
}
