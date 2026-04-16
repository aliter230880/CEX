import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetTradingPairs, useGetTicker } from "@workspace/api-client-react";
import { ArrowRight, Shield, Zap, Globe, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/lib/auth";

function PairTicker({ symbol }: { symbol: string }) {
  const { data } = useGetTicker(symbol.replace("/", "_"));
  if (!data) return null;
  const change = parseFloat(data.priceChangePercent ?? "0");
  const price = parseFloat(data.lastPrice ?? "0");
  return (
    <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm min-w-[160px]">
      <span className="text-sm font-semibold text-white/80">{symbol}</span>
      <div className="text-right">
        <div className="text-sm font-bold text-white">
          ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`text-xs flex items-center gap-0.5 ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { data: pairs } = useGetTradingPairs();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#060b1a] text-white overflow-x-hidden">

      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuMDMiPjxwYXRoIGQ9Ik02MCAwSDAgTTYwIDYwSDBNMCA2MFYwTTYwIDYwVjAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#060b1a]/80 backdrop-blur-xl sticky top-0">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-8 h-8 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <span className="text-xl font-bold text-white tracking-tight">ATEX</span>
          <span className="text-sm text-white/40 font-normal">exchange</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link href="/markets" className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all">Markets</Link>
          <Link href="/markets" className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all">Trade</Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/markets">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-xl px-5">
                Open Platform <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5 rounded-xl">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-xl px-5">Start Trading</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 min-h-[calc(100vh-73px)]">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          Professional Crypto Trading Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6 tracking-tight">
          <span className="text-white">Trade Crypto</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            With Confidence
          </span>
        </h1>

        <p className="text-white/50 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
          Spot trading, multi-chain wallets, and a real matching engine — built for speed and security.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
          <Link href={user ? "/markets" : "/register"}>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-2xl px-8 h-12 text-base font-semibold shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50 hover:scale-105">
              Start Trading <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/markets">
            <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 text-base border-white/20 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/30 transition-all">
              View Markets
            </Button>
          </Link>
        </div>

        {/* Live price tickers */}
        {pairs && pairs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {pairs.slice(0, 5).map(pair => (
              <PairTicker key={pair.symbol} symbol={pair.symbol} />
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-8 mt-14 text-center">
          {[
            { label: "Trading Fee", value: "0.1%" },
            { label: "Networks", value: "3 Chains" },
            { label: "Trading Pairs", value: "5 Pairs" },
          ].map(stat => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Built for real trading</h2>
          <p className="text-white/40 text-base">Everything you need in one platform</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: <Zap className="w-6 h-6 text-blue-400" />,
              title: "Low Fees",
              desc: "0.1% flat fee on every trade. No hidden charges, no surprises.",
              glow: "blue",
            },
            {
              icon: <Globe className="w-6 h-6 text-violet-400" />,
              title: "Multi-Chain",
              desc: "Deposit and withdraw on Ethereum, BNB Smart Chain and Polygon.",
              glow: "violet",
            },
            {
              icon: <Shield className="w-6 h-6 text-cyan-400" />,
              title: "HD Wallets",
              desc: "Every user gets a unique derived address — your keys, your assets.",
              glow: "cyan",
            },
          ].map(f => (
            <div
              key={f.title}
              className="relative group p-7 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/8 hover:border-white/20 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-${f.glow}-500/10 border border-${f.glow}-500/20 flex items-center justify-center mb-5`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="relative z-10 px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto p-10 rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-900/20 to-violet-900/10 backdrop-blur-sm">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to start?</h2>
          <p className="text-white/50 mb-8">Create an account and start trading in minutes.</p>
          <Link href="/register">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-2xl px-10 h-12 text-base font-semibold shadow-lg shadow-blue-600/30 hover:scale-105 transition-all">
              Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-5 h-5 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          <span className="text-sm text-white/30">ATEX exchange © 2026</span>
        </div>
        <div className="flex items-center gap-5 text-xs text-white/30">
          <Link href="/markets" className="hover:text-white/60 transition-colors">Markets</Link>
          <Link href="/login" className="hover:text-white/60 transition-colors">Login</Link>
          <Link href="/register" className="hover:text-white/60 transition-colors">Register</Link>
        </div>
      </footer>

      {/* ── Orb animation styles ── */}
      <style>{`
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          animation: orbFloat 8s ease-in-out infinite;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%);
          top: 5%; left: 10%;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%);
          top: 30%; right: 5%;
          animation-delay: 2.5s;
        }
        .orb-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%);
          bottom: 10%; left: 35%;
          animation-delay: 5s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.8; }
          50% { transform: translateY(-30px) scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
