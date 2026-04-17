import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useGetTradingPairs, useGetTicker, getGetTickerQueryKey } from "@workspace/api-client-react";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";
import { ETHGlass, BTCGlass, BNBGlass, SOLGlass, POLGlass } from "@/components/GlassToken3D";

/* ── Token SVG icons (inline, no external deps) ──────────────────── */
const TOKEN_SVGS: Record<string, { svg: string; glow: string }> = {
  BTC: {
    glow: "#F7931A",
    svg: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="l-btc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFB347"/><stop offset="100%" stop-color="#F7931A"/></linearGradient></defs><path d="M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z" fill="url(#l-btc)"/></svg>`,
  },
  ETH: {
    glow: "#627EEA",
    svg: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="l-eth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#9ab4f7"/><stop offset="100%" stop-color="#627EEA"/></linearGradient></defs><path d="M16 5l-6.5 11.5L16 20l6.5-3.5L16 5z" fill="url(#l-eth)" opacity="0.95"/><path d="M9.5 16.5L16 20l6.5-3.5-6.5 10.5-6.5-10.5z" fill="url(#l-eth)" opacity="0.7"/></svg>`,
  },
  BNB: {
    glow: "#F0B90B",
    svg: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="l-bnb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="100%" stop-color="#F0B90B"/></linearGradient></defs><path d="M16 9l2.5 2.5L16 14l-2.5-2.5L16 9zM9 16l2.5-2.5 2.5 2.5-2.5 2.5L9 16zM23 16l-2.5 2.5-2.5-2.5 2.5-2.5L23 16zM16 18.5l2.5 2.5L16 23.5l-2.5-2.5L16 18.5z" fill="url(#l-bnb)"/><rect x="14" y="14" width="4" height="4" rx="1" fill="url(#l-bnb)" transform="rotate(45 16 16)"/></svg>`,
  },
  SOL: {
    glow: "#9945FF",
    svg: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="l-sol" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#14F195"/></linearGradient></defs><path d="M8 20.5h13.5l-2.5 2.5H8l2.5-2.5zM8 14.8h13.5l2.5-2.5H10.5L8 14.8zM21.5 9H8l2.5 2.5H24L21.5 9z" fill="url(#l-sol)"/></svg>`,
  },
  POL: {
    glow: "#8247E5",
    svg: `<svg viewBox="0 0 32 32" fill="none"><defs><linearGradient id="l-pol" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#8247E5"/></linearGradient></defs><path d="M20 12l-4-2.3-4 2.3v4.6l4 2.3 4-2.3V12zm-4-4l7 4v8l-7 4-7-4v-8l7-4z" fill="url(#l-pol)"/></svg>`,
  },
};

/* ── Particle canvas (decorative) ──────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.4 + 0.1,
      color: ["#00ff88", "#00e5ff", "#a855f7"][Math.floor(Math.random() * 3)],
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill(); ctx.globalAlpha = 1;
      }
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80) {
          ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = "#00ff88"; ctx.globalAlpha = (1 - d / 80) * 0.06; ctx.lineWidth = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ── Floating 3D glass tokens (decorative) ──────────────────────────── */
function FloatingGlassTokens() {
  return (
    <>
      {/* BTC — top-left: moved +63px more toward center */}
      <div style={{ position: "absolute", left: "128px", top: "calc(4% + 63px)", pointerEvents: "none", zIndex: 3 }}>
        <BTCGlass size={190} delay={0}/>
      </div>
      {/* ETH — top-right: moved +60px more toward center, size −15% = 153px, +10% vertical */}
      <div style={{ position: "absolute", right: "125px", top: "calc(2% + 60px)", pointerEvents: "none", zIndex: 3 }}>
        <div style={{ transform: "scaleY(1.21)", transformOrigin: "center center" }}>
          <ETHGlass size={153} delay={1.5}/>
        </div>
      </div>
      {/* SOL — left mid: unchanged */}
      <div style={{ position: "absolute", left: "60px", top: "50%", pointerEvents: "none", zIndex: 3 }}>
        <SOLGlass size={180} delay={2.2}/>
      </div>
      {/* BNB — right mid: +20% = 204px */}
      <div style={{ position: "absolute", right: "60px", top: "45%", pointerEvents: "none", zIndex: 3 }}>
        <BNBGlass size={204} delay={0.8}/>
      </div>
      {/* POL — bottom-center: +20% = 192px */}
      <div style={{ position: "absolute", left: "50%", bottom: "-15px", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 3 }}>
        <POLGlass size={192} delay={0.4}/>
      </div>
    </>
  );
}

/* ── Live pair ticker pill (uses real API data) ─────────────────────── */
function PairTicker({ symbol }: { symbol: string }) {
  const apiPair = symbol.replace("/", "-");
  const { data } = useGetTicker(apiPair, { query: { queryKey: getGetTickerQueryKey(apiPair) } });
  const flash = useFlashOnChange(data?.lastPrice);
  if (!data) return null;
  const change = parseFloat(data.priceChangePercent ?? "0");
  const price  = parseFloat(data.lastPrice ?? "0");
  const baseSymbol = symbol.split("/")[0];
  const info = TOKEN_SVGS[baseSymbol];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px",
      borderRadius: 50, background: "rgba(255,255,255,0.03)",
      border: `1px solid ${info?.glow ?? "#fff"}22`,
      backdropFilter: "blur(16px)",
      boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 16px ${info?.glow ?? "#00ff88"}10`,
      transition: "all 0.3s",
    }}
      className={flash === "up" ? "price-flash-up" : flash === "down" ? "price-flash-down" : ""}
    >
      {info && (
        <div dangerouslySetInnerHTML={{ __html: info.svg }}
          style={{ width: 20, height: 20, flexShrink: 0, filter: `drop-shadow(0 0 4px ${info.glow}88)` }} />
      )}
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>{symbol}</span>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#fff" }}>
        ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: change >= 0 ? "#00ff88" : "#f87171", display: "flex", alignItems: "center", gap: 2 }}>
        {change >= 0 ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
      </span>
    </div>
  );
}

/* ── Mini chart bars (decorative) ─────────────────────────────────── */
function MiniChart() {
  const vals = [45, 62, 38, 71, 55, 80, 48, 92, 67, 85, 58, 76, 42, 88, 63, 74, 51, 95];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56 }}>
      {vals.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`, borderRadius: "2px 2px 0 0",
          background: i > 14 ? "linear-gradient(180deg,#00ff88,#00c866)" : i > 10 ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.06)",
          boxShadow: i > 14 ? "0 0 6px rgba(0,255,136,0.5)" : "none",
        }} />
      ))}
    </div>
  );
}

/* ── Main landing component ────────────────────────────────────────── */
export default function Landing() {
  const { data: pairs } = useGetTradingPairs();
  const { user } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: "#050912", color: "#fff", overflowX: "hidden", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <style>{`
        @keyframes shimmerText { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes glowPulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes borderGlow  { 0%,100%{border-color:rgba(0,255,136,.2);box-shadow:0 0 16px rgba(0,255,136,.08)} 50%{border-color:rgba(0,229,255,.3);box-shadow:0 0 24px rgba(0,229,255,.12)} }
        @keyframes dashFloat   { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-12px) rotate(.4deg)} 66%{transform:translateY(-5px) rotate(-.4deg)} }
        @keyframes liqBlob1    { 0%,100%{border-radius:60% 40% 55% 45%/45% 55% 40% 60%;transform:translate(0,0) scale(1)} 25%{border-radius:45% 55% 40% 60%/55% 45% 60% 40%;transform:translate(25px,-18px) scale(1.04)} 50%{border-radius:55% 45% 60% 40%/40% 60% 45% 55%;transform:translate(-12px,22px) scale(.96)} 75%{border-radius:40% 60% 45% 55%/60% 40% 55% 45%;transform:translate(18px,8px) scale(1.02)} }
        @keyframes liqBlob2    { 0%,100%{border-radius:45% 55% 65% 35%/35% 65% 45% 55%;transform:translate(0,0) rotate(0deg)} 33%{border-radius:65% 35% 45% 55%/55% 45% 65% 35%;transform:translate(-22px,18px) rotate(8deg)} 66%{border-radius:35% 65% 55% 45%/45% 55% 35% 65%;transform:translate(18px,-12px) rotate(-6deg)} }
        @keyframes liqBlob3    { 0%,100%{border-radius:70% 30% 50% 50%/50% 50% 70% 30%;transform:scale(1) translate(0,0)} 40%{border-radius:30% 70% 60% 40%/40% 60% 30% 70%;transform:scale(1.05) translate(12px,-18px)} 80%{border-radius:50% 50% 30% 70%/70% 30% 50% 50%;transform:scale(.94) translate(-8px,12px)} }
        @keyframes orbDrift    { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(35px,-25px) scale(1.05)} 50%{transform:translate(-18px,22px) scale(.95)} 75%{transform:translate(28px,35px) scale(1.03)} }
        @keyframes scanLine    { 0%{transform:translateY(-100vh)} 100%{transform:translateY(200vh)} }
        @keyframes pulseRing   { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.9;transform:scale(1.07)} }
        .atex-btn-primary { background: linear-gradient(135deg,#00ff88,#00c866); color: #050912; border: none; font-weight: 800; transition: all .3s; position: relative; overflow: hidden; }
        .atex-btn-primary::before { content:''; position:absolute; top:-50%; left:-120%; width:280%; height:200%; background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.18) 50%,transparent 100%); transition:left .5s; }
        .atex-btn-primary:hover::before { left:120%; }
        .atex-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 36px rgba(0,255,136,.45) !important; color:#050912; }
        .atex-btn-ghost { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.7); transition:all .3s; }
        .atex-btn-ghost:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.2); color:#fff; }
        .atex-card { background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.07); backdrop-filter:blur(20px); box-shadow:inset 0 1px 0 rgba(255,255,255,.04); transition:all .4s cubic-bezier(.4,0,.2,1); }
        .atex-card:hover { background:rgba(255,255,255,.05); transform:translateY(-5px); }
      `}</style>

      <ParticleCanvas />

      {/* ── Liquid blobs ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id="atex-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8" result="goo" />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
        <div style={{ position: "absolute", top: "5%", left: "8%", filter: "url(#atex-goo)" }}>
          <div style={{ width: 300, height: 300, borderRadius: "50%", background: "rgba(0,255,136,0.06)", animation: "liqBlob1 14s ease-in-out infinite" }} />
          <div style={{ width: 200, height: 200, borderRadius: "50%", background: "rgba(0,255,136,0.04)", marginTop: -160, marginLeft: 55, animation: "liqBlob2 11s ease-in-out infinite 2s" }} />
        </div>
        <div style={{ position: "absolute", top: "40%", right: "4%", filter: "url(#atex-goo)" }}>
          <div style={{ width: 240, height: 240, borderRadius: "50%", background: "rgba(0,229,255,0.05)", animation: "liqBlob3 13s ease-in-out infinite .5s" }} />
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: "rgba(0,229,255,0.04)", marginTop: -130, marginLeft: 45, animation: "liqBlob1 10s ease-in-out infinite 3s" }} />
        </div>
        <div style={{ position: "absolute", bottom: "8%", left: "33%", filter: "url(#atex-goo)" }}>
          <div style={{ width: 260, height: 260, borderRadius: "50%", background: "rgba(168,85,247,0.05)", animation: "liqBlob2 15s ease-in-out infinite 1.5s" }} />
        </div>
        <div style={{ position: "absolute", top: "12%", left: "18%", width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,255,136,0.07) 0%,transparent 70%)", filter: "blur(50px)", animation: "orbDrift 18s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "18%", right: "12%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,229,255,0.06) 0%,transparent 70%)", filter: "blur(50px)", animation: "orbDrift 14s ease-in-out infinite reverse 2s" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,255,136,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,.02) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent 0%,rgba(0,255,136,.1) 30%,rgba(0,255,136,.22) 50%,rgba(0,255,136,.1) 70%,transparent 100%)", animation: "scanLine 12s linear infinite" }} />
      </div>

      {/* ── Floating 3D glass tokens ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }}>
        <FloatingGlassTokens/>
      </div>

      {/* ── Navbar ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(5,9,18,0.75)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src="/logo.png" alt="ATEX" style={{ width: 42, height: 42, objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(0,180,255,.55))" }} />
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, background: "linear-gradient(135deg,#fff 60%,rgba(255,255,255,.5))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ATEX</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 400 }}>exchange</span>
          </Link>

          <div style={{ display: "flex", gap: 2 }}>
            {[
              { label: "Markets", href: "/markets" },
              { label: "Trade",   href: "/markets" },
            ].map(item => (
              <Link key={item.label} href={item.href} style={{ padding: "8px 16px", borderRadius: 8, color: "rgba(255,255,255,.48)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "all .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.48)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >{item.label}</Link>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {user ? (
              <Link href="/markets">
                <Button className="atex-btn-primary rounded-xl px-5 h-9 text-sm">
                  Open Platform <ArrowRight style={{ width: 14, height: 14, marginLeft: 4 }} />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button className="atex-btn-ghost rounded-xl px-5 h-9 text-sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button className="atex-btn-primary rounded-xl px-5 h-9 text-sm" style={{ boxShadow: "0 0 22px rgba(0,255,136,.3)" }}>
                    Start Trading
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: "relative", zIndex: 5, padding: "80px 32px 60px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "calc(100vh - 64px)" }}>

        {/* Live badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 50, marginBottom: 32, background: "rgba(0,255,136,0.07)", border: "1px solid rgba(0,255,136,0.2)", animation: "borderGlow 3s ease-in-out infinite" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88", animation: "glowPulse 2s ease-in-out infinite" }} />
          <span style={{ color: "#00ff88", fontSize: 13, fontWeight: 600 }}>Professional Crypto Trading Platform</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "clamp(42px,6vw,72px)", fontWeight: 900, lineHeight: 1.07, letterSpacing: -2.5, marginBottom: 22, maxWidth: 800 }}>
          <span style={{ background: "linear-gradient(180deg,#fff 40%,rgba(255,255,255,.55))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trade Crypto</span>
          <br />
          <span style={{ background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7,#00ff88)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "shimmerText 4s linear infinite" }}>
            With Confidence
          </span>
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,.42)", maxWidth: 500, marginBottom: 40 }}>
          Spot trading, multi-chain wallets, and a real matching engine — built for speed and security.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 12, marginBottom: 56, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href={user ? "/markets" : "/register"}>
            <Button className="atex-btn-primary rounded-2xl px-8 h-12 text-base" style={{ boxShadow: "0 0 28px rgba(0,255,136,.32),0 4px 22px rgba(0,0,0,.4)" }}>
              Start Trading <ArrowRight style={{ width: 16, height: 16, marginLeft: 6 }} />
            </Button>
          </Link>
          <Link href="/markets">
            <Button className="atex-btn-ghost rounded-2xl px-8 h-12 text-base">
              View Markets
            </Button>
          </Link>
        </div>

        {/* Live price tickers from API */}
        {pairs && pairs.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 56 }}>
            {pairs.slice(0, 5).map(pair => (
              <PairTicker key={pair.symbol} symbol={pair.symbol} />
            ))}
          </div>
        )}

        {/* Floating dashboard card */}
        <div style={{
          width: "100%", maxWidth: 780,
          borderRadius: 26, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(32px)",
          boxShadow: "0 36px 90px rgba(0,0,0,.65),0 0 50px rgba(0,255,136,.04),inset 0 1px 0 rgba(255,255,255,.07)",
          padding: 28, animation: "dashFloat 9s ease-in-out infinite",
          position: "relative", overflow: "hidden",
        }}>
          <style>{`@keyframes dashFloat{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-12px) rotate(.4deg)}66%{transform:translateY(-5px) rotate(-.4deg)}}`}</style>
          <div style={{ position: "absolute", top: 0, left: "25%", right: "25%", height: 1, background: "linear-gradient(90deg,transparent,rgba(0,255,136,.4),transparent)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: "radial-gradient(circle at 50% 0%,rgba(0,255,136,.04) 0%,transparent 60%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>BTC / USDT · Live</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1.5, color: "#fff" }}>
                {pairs?.find(p => p.symbol === "BTC/USDT") ? "" : "$83,412"}
                <span style={{ fontSize: 18, color: "rgba(255,255,255,.35)" }}></span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(0,255,136,.12)", border: "1px solid rgba(0,255,136,.22)", color: "#00ff88", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>▲ LIVE</div>
              <Link href="/markets" style={{ fontSize: 12, color: "rgba(255,255,255,.35)", textDecoration: "none" }}>Open Chart →</Link>
            </div>
          </div>
          <MiniChart />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18 }}>
            {[
              { label: "Trading Fee", value: "0.1%",   color: "#00e5ff" },
              { label: "Networks",    value: "3 Chains", color: "#00ff88" },
              { label: "Pairs",       value: "5+",      color: "#a855f7" },
            ].map(s => (
              <div key={s.label} style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: .5, marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ position: "relative", zIndex: 5, padding: "20px 32px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, marginBottom: 10, background: "linear-gradient(180deg,#fff 50%,rgba(255,255,255,.45))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Built for real trading
            </h2>
            <p style={{ color: "rgba(255,255,255,.3)", fontSize: 16 }}>Everything you need in one platform</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { icon: "⚡", title: "Low Fees",    desc: "0.1% flat fee on every trade. No hidden charges, no surprises.",                            glow: "#00ff88" },
              { icon: "🌐", title: "Multi-Chain", desc: "Deposit and withdraw on Ethereum, BNB Smart Chain and Polygon.",                              glow: "#00e5ff" },
              { icon: "🔐", title: "HD Wallets",  desc: "Every user gets a unique derived address — your keys, your assets.",                         glow: "#a855f7" },
            ].map(f => (
              <div key={f.title} className="atex-card" style={{ padding: "26px 22px", borderRadius: 20 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = f.glow + "44"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px ${f.glow}18,inset 0 1px 0 rgba(255,255,255,.1)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.04)"; }}
              >
                <div style={{ width: 46, height: 46, borderRadius: 13, marginBottom: 16, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${f.glow}22,${f.glow}08)`, border: `1px solid ${f.glow}30`, boxShadow: `0 0 18px ${f.glow}18` }}>{f.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.38)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section style={{ position: "relative", zIndex: 5, padding: "0 32px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            borderRadius: 30, padding: "60px 40px",
            background: "linear-gradient(135deg,rgba(0,255,136,.07) 0%,rgba(0,229,255,.04) 50%,rgba(168,85,247,.07) 100%)",
            border: "1px solid rgba(0,255,136,.14)",
            backdropFilter: "blur(28px)",
            textAlign: "center", position: "relative", overflow: "hidden",
            boxShadow: "0 0 70px rgba(0,255,136,.04),inset 0 1px 0 rgba(255,255,255,.06)",
          }}>
            <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 360, height: 120, background: "radial-gradient(ellipse,rgba(0,255,136,.09) 0%,transparent 70%)", filter: "blur(18px)", pointerEvents: "none" }} />
            <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.5, marginBottom: 12, background: "linear-gradient(135deg,#fff 60%,rgba(255,255,255,.65))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", position: "relative" }}>
              Ready to start?
            </h2>
            <p style={{ color: "rgba(255,255,255,.38)", fontSize: 17, marginBottom: 36, position: "relative" }}>
              Create an account and start trading in minutes.
            </p>
            <Link href="/register">
              <Button className="atex-btn-primary rounded-2xl px-10 h-12 text-base" style={{ boxShadow: "0 0 36px rgba(0,255,136,.35),0 8px 28px rgba(0,0,0,.4)", position: "relative", fontSize: 16 }}>
                Create Free Account <ArrowRight style={{ width: 16, height: 16, marginLeft: 6 }} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 5, borderTop: "1px solid rgba(255,255,255,.05)", padding: "24px 32px", background: "rgba(5,9,18,.85)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="ATEX" style={{ width: 24, height: 24, objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(0,255,136,.4))" }} />
          <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>ATEX exchange © 2026</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Markets",  href: "/markets"  },
            { label: "Login",    href: "/login"    },
            { label: "Register", href: "/register" },
          ].map(l => (
            <Link key={l.label} href={l.href} style={{ color: "rgba(255,255,255,.28)", fontSize: 13, textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.6)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.28)"; }}
            >{l.label}</Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
