import { useEffect, useRef, useState } from "react";

const TICKERS = [
  { symbol: "BTC", price: "83,412.00", change: "+2.34", up: true },
  { symbol: "ETH", price: "3,194.80", change: "+1.87", up: true },
  { symbol: "BNB", price: "608.44", change: "-0.62", up: false },
  { symbol: "SOL", price: "175.20", change: "+4.15", up: true },
  { symbol: "POL", price: "0.7820", change: "-1.23", up: false },
  { symbol: "USDT", price: "1.0000", change: "0.00", up: true },
];

const FEATURES = [
  {
    icon: "⚡",
    title: "Ultra-Low Latency",
    desc: "Sub-millisecond order execution with our proprietary matching engine",
    glow: "#00ff88",
  },
  {
    icon: "🔐",
    title: "Military-Grade Security",
    desc: "HD wallets, cold storage, 2FA and multi-sig withdrawals",
    glow: "#00e5ff",
  },
  {
    icon: "🌐",
    title: "Multi-Chain Support",
    desc: "ETH, BNB Chain, Polygon — one account, all networks",
    glow: "#a855f7",
  },
  {
    icon: "📊",
    title: "Pro Trading Tools",
    desc: "Real-time charts, order books and advanced analytics",
    glow: "#f59e0b",
  },
];

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }[] = [];
    const colors = ["#00ff88", "#00e5ff", "#a855f7", "#3b82f6"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Connect close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = "#00ff88";
            ctx.globalAlpha = (1 - dist / 100) * 0.08;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function TickerRow() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset(o => o - 0.5), 16);
    return () => clearInterval(id);
  }, []);

  const doubled = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div className="overflow-hidden border-y border-white/5 bg-white/[0.02] backdrop-blur-sm py-3">
      <div
        className="flex gap-4 whitespace-nowrap"
        style={{ transform: `translateX(${offset % (TICKERS.length * 220)}px)`, transition: "none" }}
      >
        {doubled.map((t, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              minWidth: 200,
            }}
          >
            <span className="text-sm font-bold text-white/70">{t.symbol}/USDT</span>
            <span className="text-sm font-mono font-semibold text-white">${t.price}</span>
            <span className={`text-xs font-semibold ${t.up ? "text-emerald-400" : "text-red-400"}`}>
              {t.up ? "▲" : "▼"} {t.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GlassCard({ feature }: { feature: typeof FEATURES[0] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative p-6 rounded-2xl cursor-pointer transition-all duration-500"
      style={{
        background: hovered
          ? `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`
          : "rgba(255,255,255,0.03)",
        border: hovered ? `1px solid ${feature.glow}44` : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        boxShadow: hovered ? `0 0 30px ${feature.glow}22, inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="text-3xl mb-4 w-12 h-12 flex items-center justify-center rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${feature.glow}22, ${feature.glow}08)`,
          border: `1px solid ${feature.glow}33`,
          boxShadow: `0 0 20px ${feature.glow}22`,
        }}
      >
        {feature.icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>

      {hovered && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${feature.glow}0a 0%, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

function StatCard({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center p-6 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        className="text-3xl font-bold mb-1"
        style={{
          background: "linear-gradient(135deg, #00ff88, #00e5ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {value}
      </div>
      <div className="text-white/80 font-medium text-sm">{label}</div>
      <div className="text-white/30 text-xs mt-1">{sub}</div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen text-white overflow-x-hidden font-sans" style={{ background: "#050912" }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -30px) scale(1.05); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
          75% { transform: translate(30px, 40px) scale(1.02); }
        }
        @keyframes border-glow {
          0%, 100% { border-color: rgba(0,255,136,0.2); box-shadow: 0 0 20px rgba(0,255,136,0.1); }
          50% { border-color: rgba(0,229,255,0.3); box-shadow: 0 0 30px rgba(0,229,255,0.15); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #00ff88, #00e5ff, #a855f7, #00ff88);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .cta-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .cta-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -100%;
          width: 300%;
          height: 200%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          transition: left 0.5s;
        }
        .cta-btn:hover::before { left: 100%; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(0,255,136,0.4); }
      `}</style>

      <ParticleCanvas />

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        <div style={{
          position: "absolute", top: "10%", left: "15%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,136,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "orb-drift 12s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "50%", right: "10%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "orb-drift 16s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", bottom: "15%", left: "40%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "orb-drift 10s ease-in-out infinite 3s",
        }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
        {/* Scan line */}
        <div style={{
          position: "absolute", left: 0, right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.15), transparent)",
          animation: "scan 8s linear infinite",
        }} />
      </div>

      {/* Navbar */}
      <nav className="relative sticky top-0" style={{
        zIndex: 50,
        background: "rgba(5,9,18,0.7)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #00ff88, #00e5ff)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(0,255,136,0.4)",
              fontSize: 18, fontWeight: 900, color: "#050912",
            }}>A</div>
            <span style={{
              fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
              background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.6))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>ATEX</span>
            <span style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 20,
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.25)",
              color: "#00ff88", fontWeight: 600, letterSpacing: 1,
            }}>PRO</span>
          </div>

          <div className="flex items-center gap-1">
            {["Markets", "Trade", "Earn", "Launchpad"].map(item => (
              <a key={item} href="#" style={{
                padding: "8px 16px", borderRadius: 8,
                color: "rgba(255,255,255,0.5)",
                fontSize: 14, fontWeight: 500,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.color = "#fff";
                  (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                  (e.target as HTMLElement).style.background = "transparent";
                }}
              >{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button style={{
              padding: "9px 20px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}>Log In</button>
            <button className="cta-btn" style={{
              padding: "9px 22px", borderRadius: 10,
              background: "linear-gradient(135deg, #00ff88, #00c866)",
              border: "none",
              color: "#050912",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Ticker */}
      <TickerRow />

      {/* Hero */}
      <section className="relative" style={{ zIndex: 2, paddingTop: 90, paddingBottom: 80 }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col items-center text-center">

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 50,
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)",
            marginBottom: 28,
            animation: "border-glow 3s ease-in-out infinite",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88", animation: "pulse-glow 2s ease-in-out infinite" }} />
            <span style={{ color: "#00ff88", fontSize: 13, fontWeight: 600 }}>Live • 127,438 traders online</span>
          </div>

          <h1 style={{
            fontSize: "clamp(42px, 6vw, 72px)",
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: -2,
            marginBottom: 24,
            maxWidth: 800,
          }}>
            <span style={{
              background: "linear-gradient(180deg, #ffffff 40%, rgba(255,255,255,0.6) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>The Future of</span>
            <br />
            <span className="shimmer-text">Crypto Trading</span>
            <br />
            <span style={{
              background: "linear-gradient(180deg, #ffffff 40%, rgba(255,255,255,0.6) 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>is Here</span>
          </h1>

          <p style={{
            fontSize: 18, lineHeight: 1.7,
            color: "rgba(255,255,255,0.45)",
            maxWidth: 540, marginBottom: 42,
          }}>
            Trade 200+ cryptocurrencies with the speed, security and intelligence of a professional-grade exchange — designed for everyone.
          </p>

          <div className="flex items-center gap-4" style={{ marginBottom: 70 }}>
            <button className="cta-btn" style={{
              padding: "16px 36px", borderRadius: 14,
              background: "linear-gradient(135deg, #00ff88, #00c866)",
              border: "none",
              color: "#050912",
              fontSize: 16, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 0 30px rgba(0,255,136,0.3), 0 4px 24px rgba(0,0,0,0.4)",
            }}>
              Start Trading Free →
            </button>
            <button style={{
              padding: "16px 36px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.8)",
              fontSize: 16, fontWeight: 600, cursor: "pointer",
              backdropFilter: "blur(12px)",
              transition: "all 0.3s",
            }}>
              ▶ Watch Demo
            </button>
          </div>

          {/* Floating mock dashboard card */}
          <div style={{
            width: "100%", maxWidth: 820,
            borderRadius: 24,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(30px)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,136,0.05), inset 0 1px 0 rgba(255,255,255,0.08)",
            padding: 28,
            animation: "float 8s ease-in-out infinite",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Scan overlay inside card */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 24,
              background: "linear-gradient(180deg, transparent 0%, rgba(0,255,136,0.02) 50%, transparent 100%)",
              pointerEvents: "none",
            }} />

            {/* Mini chart header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>BTC / USDT</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>$83,412<span style={{ fontSize: 18, color: "rgba(255,255,255,0.4)" }}>.00</span></div>
              </div>
              <div style={{
                padding: "6px 14px", borderRadius: 8,
                background: "rgba(0,255,136,0.12)",
                border: "1px solid rgba(0,255,136,0.2)",
                color: "#00ff88", fontSize: 14, fontWeight: 700,
              }}>▲ +2.34%</div>
            </div>

            {/* Fake chart bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, marginBottom: 20 }}>
              {[45, 62, 38, 71, 55, 80, 48, 92, 67, 85, 58, 76, 42, 88, 63, 74, 51, 95, 69, 82].map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: "3px 3px 0 0",
                  background: i > 15
                    ? "linear-gradient(180deg, #00ff88, #00c866)"
                    : i > 10 ? "rgba(0,255,136,0.4)" : "rgba(255,255,255,0.08)",
                  boxShadow: i > 15 ? "0 0 8px rgba(0,255,136,0.4)" : "none",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>

            {/* Bottom stats row */}
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "24h Volume", value: "$2.4B", color: "#00e5ff" },
                { label: "24h High", value: "$84,720", color: "#00ff88" },
                { label: "24h Low", value: "$81,350", color: "#f87171" },
                { label: "Open Interest", value: "$18.2B", color: "#a855f7" },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", zIndex: 2, padding: "20px 0 60px" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            <StatCard value="$4.2B" label="Daily Volume" sub="Across all pairs" />
            <StatCard value="200+" label="Trading Pairs" sub="Spot & derivatives" />
            <StatCard value="98ms" label="Order Speed" sub="Average execution" />
            <StatCard value="850K+" label="Active Traders" sub="In 150+ countries" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 2, padding: "40px 0 80px" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-12">
            <h2 style={{
              fontSize: 40, fontWeight: 800, letterSpacing: -1,
              background: "linear-gradient(180deg, #fff 50%, rgba(255,255,255,0.5))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: 12,
            }}>Built for Performance</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 16 }}>Enterprise-grade infrastructure, consumer-friendly design</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {FEATURES.map(f => <GlassCard key={f.title} feature={f} />)}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 0 80px" }}>
        <div className="max-w-7xl mx-auto px-8">
          <div style={{
            borderRadius: 28,
            padding: "60px 60px",
            background: "linear-gradient(135deg, rgba(0,255,136,0.08) 0%, rgba(0,229,255,0.05) 50%, rgba(168,85,247,0.08) 100%)",
            border: "1px solid rgba(0,255,136,0.15)",
            backdropFilter: "blur(30px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 80px rgba(0,255,136,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div style={{
              position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
              width: 400, height: 200,
              background: "radial-gradient(ellipse, rgba(0,255,136,0.12) 0%, transparent 70%)",
              filter: "blur(30px)",
            }} />
            <h2 style={{
              fontSize: 44, fontWeight: 900, letterSpacing: -1.5,
              marginBottom: 16, position: "relative",
              background: "linear-gradient(135deg, #fff 60%, rgba(255,255,255,0.7))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Ready to trade smarter?</h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 17, marginBottom: 36, position: "relative" }}>
              Join 850,000+ traders already using ATEX. No fees for the first 30 days.
            </p>
            <button className="cta-btn" style={{
              padding: "18px 48px", borderRadius: 14,
              background: "linear-gradient(135deg, #00ff88, #00c866)",
              border: "none",
              color: "#050912",
              fontSize: 18, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 0 40px rgba(0,255,136,0.35), 0 8px 32px rgba(0,0,0,0.4)",
              position: "relative",
            }}>
              Create Free Account →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 0",
        background: "rgba(5,9,18,0.8)",
        backdropFilter: "blur(20px)",
      }}>
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #00ff88, #00e5ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 900, color: "#050912",
            }}>A</div>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>© 2026 ATEX Exchange. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Support", "API Docs"].map(l => (
              <a key={l} href="#" style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
