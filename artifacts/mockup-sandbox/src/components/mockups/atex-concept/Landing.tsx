import { useEffect, useRef, useState } from "react";

/* ── Token SVG icons — NO background circle, just the symbol paths ── */
const TOKEN_ICONS: Record<string, { svg: string; color: string; glow: string }> = {
  BTC: {
    color: "#F7931A",
    glow: "#F7931A",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="btcg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFB347"/>
          <stop offset="100%" stop-color="#F7931A"/>
        </linearGradient>
      </defs>
      <path d="M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z" fill="url(#btcg)"/>
    </svg>`,
  },
  ETH: {
    color: "#627EEA",
    glow: "#627EEA",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ethg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9ab4f7"/>
          <stop offset="100%" stop-color="#627EEA"/>
        </linearGradient>
      </defs>
      <path d="M16 5l-6.5 11.5L16 20l6.5-3.5L16 5z" fill="url(#ethg)" opacity="0.95"/>
      <path d="M9.5 16.5L16 20l6.5-3.5-6.5 10.5-6.5-10.5z" fill="url(#ethg)" opacity="0.7"/>
    </svg>`,
  },
  BNB: {
    color: "#F0B90B",
    glow: "#F0B90B",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bnbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe066"/>
          <stop offset="100%" stop-color="#F0B90B"/>
        </linearGradient>
      </defs>
      <path d="M16 9l2.5 2.5L16 14l-2.5-2.5L16 9zM9 16l2.5-2.5 2.5 2.5-2.5 2.5L9 16zM23 16l-2.5 2.5-2.5-2.5 2.5-2.5L23 16zM16 18.5l2.5 2.5L16 23.5l-2.5-2.5L16 18.5z" fill="url(#bnbg)"/>
      <rect x="14" y="14" width="4" height="4" rx="1" fill="url(#bnbg)" transform="rotate(45 16 16)"/>
    </svg>`,
  },
  SOL: {
    color: "#9945FF",
    glow: "#9945FF",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="solg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="#14F195"/>
        </linearGradient>
      </defs>
      <path d="M8 20.5h13.5l-2.5 2.5H8l2.5-2.5zM8 14.8h13.5l2.5-2.5H10.5L8 14.8zM21.5 9H8l2.5 2.5H24L21.5 9z" fill="url(#solg)"/>
    </svg>`,
  },
  POL: {
    color: "#8247E5",
    glow: "#8247E5",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="polg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c084fc"/>
          <stop offset="100%" stop-color="#8247E5"/>
        </linearGradient>
      </defs>
      <path d="M20 12l-4-2.3-4 2.3v4.6l4 2.3 4-2.3V12zm-4-4l7 4v8l-7 4-7-4v-8l7-4z" fill="url(#polg)"/>
    </svg>`,
  },
  USDT: {
    color: "#26A17B",
    glow: "#26A17B",
    svg: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="usdtg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#50d8a8"/>
          <stop offset="100%" stop-color="#26A17B"/>
        </linearGradient>
      </defs>
      <path d="M17 8v3h4v2h-9v-2h4v-3h1zm-5 7c0 2.7 1.8 4.5 4 5.2v2.8h-1v-2c-3-.7-5-3-5-6h2zm6 0h2c0 3-2 5.3-5 6v2h-1v-2.8c2.2-.7 4-2.5 4-5.2z" fill="url(#usdtg)"/>
    </svg>`,
  },
};

const TICKERS = [
  { symbol: "BTC", price: "83,412.00", change: "+2.34", up: true },
  { symbol: "ETH", price: "3,194.80", change: "+1.87", up: true },
  { symbol: "BNB", price: "608.44", change: "-0.62", up: false },
  { symbol: "SOL", price: "175.20", change: "+4.15", up: true },
  { symbol: "POL", price: "0.7820", change: "-1.23", up: false },
  { symbol: "USDT", price: "1.0000", change: "0.00", up: true },
];

/* ── Floating token logos ─────────────────────────────────────────── */
const FLOATING_TOKENS = [
  { id: "btc", symbol: "BTC", size: 80, x: "8%",  y: "18%", delay: 0,    duration: 9  },
  { id: "eth", symbol: "ETH", size: 64, x: "88%", y: "12%", delay: 1.5,  duration: 11 },
  { id: "bnb", symbol: "BNB", size: 56, x: "75%", y: "55%", delay: 0.8,  duration: 8  },
  { id: "sol", symbol: "SOL", size: 72, x: "5%",  y: "62%", delay: 2.2,  duration: 13 },
  { id: "pol", symbol: "POL", size: 48, x: "62%", y: "80%", delay: 0.3,  duration: 10 },
  { id: "usd", symbol: "USDT",size: 52, x: "18%", y: "82%", delay: 1.8,  duration: 12 },
];

function FloatingToken({ token }: { token: typeof FLOATING_TOKENS[0] }) {
  const info = TOKEN_ICONS[token.symbol];
  if (!info) return null;
  return (
    <div style={{
      position: "absolute",
      left: token.x,
      top: token.y,
      width: token.size,
      height: token.size,
      zIndex: 3,
      animation: `floatToken ${token.duration}s ease-in-out infinite`,
      animationDelay: `${token.delay}s`,
    }}>
      {/* Ambient glow halo — no fill, just radial light */}
      <div style={{
        position: "absolute",
        inset: -token.size * 0.35,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${info.glow}20 0%, ${info.glow}08 40%, transparent 70%)`,
        animation: `pulseRing ${token.duration * 0.65}s ease-in-out infinite`,
        animationDelay: `${token.delay}s`,
        pointerEvents: "none",
      }} />

      {/* The icon itself — no container, just glass-colored SVG */}
      <div
        dangerouslySetInnerHTML={{ __html: info.svg }}
        style={{
          width: "100%",
          height: "100%",
          filter: [
            `drop-shadow(0 0 ${token.size * 0.18}px ${info.glow}cc)`,
            `drop-shadow(0 0 ${token.size * 0.08}px ${info.glow}66)`,
            `drop-shadow(0 ${token.size * 0.06}px ${token.size * 0.15}px rgba(0,0,0,0.5))`,
          ].join(" "),
          opacity: 0.82,
        }}
      />
    </div>
  );
}

/* ── Liquid blob background ──────────────────────────────────────── */
function LiquidBlobs() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
      {/* SVG filter for liquid/gooey effect */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
          <filter id="goo2">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Green liquid blobs */}
      <div style={{ position: "absolute", top: "5%", left: "10%", filter: "url(#goo)" }}>
        <div style={{
          width: 320, height: 320, borderRadius: "50%",
          background: "rgba(0,255,136,0.07)",
          animation: "liquidBlob1 14s ease-in-out infinite",
        }} />
        <div style={{
          width: 220, height: 220, borderRadius: "50%",
          background: "rgba(0,255,136,0.05)",
          marginTop: -180, marginLeft: 60,
          animation: "liquidBlob2 11s ease-in-out infinite 2s",
        }} />
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(0,255,136,0.06)",
          marginTop: -140, marginLeft: 130,
          animation: "liquidBlob3 9s ease-in-out infinite 1s",
        }} />
      </div>

      {/* Cyan blobs right side */}
      <div style={{ position: "absolute", top: "40%", right: "5%", filter: "url(#goo2)" }}>
        <div style={{
          width: 260, height: 260, borderRadius: "50%",
          background: "rgba(0,229,255,0.06)",
          animation: "liquidBlob3 13s ease-in-out infinite 0.5s",
        }} />
        <div style={{
          width: 180, height: 180, borderRadius: "50%",
          background: "rgba(0,229,255,0.05)",
          marginTop: -150, marginLeft: 50,
          animation: "liquidBlob1 10s ease-in-out infinite 3s",
        }} />
      </div>

      {/* Purple blobs bottom */}
      <div style={{ position: "absolute", bottom: "10%", left: "35%", filter: "url(#goo)" }}>
        <div style={{
          width: 280, height: 280, borderRadius: "50%",
          background: "rgba(168,85,247,0.06)",
          animation: "liquidBlob2 15s ease-in-out infinite 1.5s",
        }} />
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: "rgba(168,85,247,0.05)",
          marginTop: -120, marginLeft: 80,
          animation: "liquidBlob3 12s ease-in-out infinite",
        }} />
      </div>

      {/* Soft glow orbs (no filter — behind blobs) */}
      <div style={{
        position: "absolute", top: "15%", left: "20%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,136,0.09) 0%, transparent 70%)",
        filter: "blur(50px)",
        animation: "orbDrift 18s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", bottom: "20%", right: "15%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)",
        filter: "blur(50px)",
        animation: "orbDrift 14s ease-in-out infinite reverse 2s",
      }} />

      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(0,255,136,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.025) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />
      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.12) 30%, rgba(0,255,136,0.25) 50%, rgba(0,255,136,0.12) 70%, transparent 100%)",
        animation: "scanLine 10s linear infinite",
      }} />
    </div>
  );
}

/* ── Particle canvas ─────────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#00ff88", "#00e5ff", "#a855f7", "#3b82f6", "#f59e0b"];
    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
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
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = "#00ff88";
            ctx.globalAlpha = (1 - d / 90) * 0.07;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ── Ticker ──────────────────────────────────────────────────────── */
function TickerRow() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setOffset(o => o - 0.45), 16);
    return () => clearInterval(id);
  }, []);
  const doubled = [...TICKERS, ...TICKERS, ...TICKERS];
  return (
    <div style={{
      overflow: "hidden",
      borderTop: "1px solid rgba(255,255,255,0.05)",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      background: "rgba(255,255,255,0.015)",
      backdropFilter: "blur(8px)",
      padding: "10px 0",
      position: "relative", zIndex: 10,
    }}>
      <div style={{ display: "flex", gap: 12, whiteSpace: "nowrap", transform: `translateX(${offset % (TICKERS.length * 210)}px)` }}>
        {doubled.map((t, i) => {
          const info = TOKEN_ICONS[t.symbol];
          return (
            <div key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 50, minWidth: 195,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${info?.glow ?? "#fff"}18`,
              backdropFilter: "blur(12px)",
            }}>
              <div dangerouslySetInnerHTML={{ __html: info?.svg ?? "" }} style={{ width: 20, height: 20, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{t.symbol}/USDT</span>
              <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 600, color: "#fff" }}>${t.price}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.up ? "#00ff88" : "#f87171" }}>
                {t.up ? "▲" : "▼"} {t.change}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mini chart bars ─────────────────────────────────────────────── */
function MiniChart() {
  const vals = [45, 62, 38, 71, 55, 80, 48, 92, 67, 85, 58, 76, 42, 88, 63, 74, 51, 95, 69, 82];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 72 }}>
      {vals.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`, borderRadius: "3px 3px 0 0",
          background: i > 15 ? "linear-gradient(180deg,#00ff88,#00c866)" : i > 10 ? "rgba(0,255,136,0.35)" : "rgba(255,255,255,0.07)",
          boxShadow: i > 15 ? "0 0 8px rgba(0,255,136,0.5)" : "none",
        }} />
      ))}
    </div>
  );
}

/* ── Glass feature card ──────────────────────────────────────────── */
function GlassCard({ icon, title, desc, glow }: { icon: string; title: string; desc: string; glow: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "24px 22px", borderRadius: 20, cursor: "default",
        background: hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
        border: hov ? `1px solid ${glow}44` : "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        boxShadow: hov ? `0 0 30px ${glow}20, inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 1px 0 rgba(255,255,255,0.04)",
        transform: hov ? "translateY(-5px)" : "translateY(0)",
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, marginBottom: 16, fontSize: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg,${glow}22,${glow}08)`,
        border: `1px solid ${glow}30`,
        boxShadow: `0 0 20px ${glow}20`,
      }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{desc}</div>
      {hov && <div style={{
        position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none",
        background: `radial-gradient(circle at 50% 0%, ${glow}0d 0%, transparent 70%)`,
      }} />}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export function Landing() {
  return (
    <div style={{ minHeight: "100vh", background: "#050912", color: "#fff", overflowX: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes floatToken {
          0%, 100% { transform: translateY(0px) rotate(-2deg) scale(1); }
          30%  { transform: translateY(-22px) rotate(3deg) scale(1.04); }
          60%  { transform: translateY(-10px) rotate(-1deg) scale(0.97); }
          80%  { transform: translateY(-18px) rotate(2deg) scale(1.02); }
        }
        @keyframes pulseRing {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes liquidBlob1 {
          0%,100% { border-radius: 60% 40% 55% 45%/45% 55% 40% 60%; transform: translate(0,0) scale(1); }
          25%     { border-radius: 45% 55% 40% 60%/55% 45% 60% 40%; transform: translate(30px,-20px) scale(1.04); }
          50%     { border-radius: 55% 45% 60% 40%/40% 60% 45% 55%; transform: translate(-15px,25px) scale(0.96); }
          75%     { border-radius: 40% 60% 45% 55%/60% 40% 55% 45%; transform: translate(20px,10px) scale(1.02); }
        }
        @keyframes liquidBlob2 {
          0%,100% { border-radius: 45% 55% 65% 35%/35% 65% 45% 55%; transform: translate(0,0) rotate(0deg); }
          33%     { border-radius: 65% 35% 45% 55%/55% 45% 65% 35%; transform: translate(-25px,20px) rotate(10deg); }
          66%     { border-radius: 35% 65% 55% 45%/45% 55% 35% 65%; transform: translate(20px,-15px) rotate(-8deg); }
        }
        @keyframes liquidBlob3 {
          0%,100% { border-radius: 70% 30% 50% 50%/50% 50% 70% 30%; transform: scale(1) translate(0,0); }
          40%     { border-radius: 30% 70% 60% 40%/40% 60% 30% 70%; transform: scale(1.06) translate(15px,-20px); }
          80%     { border-radius: 50% 50% 30% 70%/70% 30% 50% 50%; transform: scale(0.94) translate(-10px,15px); }
        }
        @keyframes orbDrift {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(40px,-30px) scale(1.06); }
          50%     { transform: translate(-20px,25px) scale(0.95); }
          75%     { transform: translate(30px,40px) scale(1.03); }
        }
        @keyframes scanLine {
          0%   { transform: translateY(-100vh); }
          100% { transform: translateY(200vh); }
        }
        @keyframes shimmerText {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes borderGlow {
          0%,100% { border-color: rgba(0,255,136,0.2); box-shadow: 0 0 16px rgba(0,255,136,0.08); }
          50%      { border-color: rgba(0,229,255,0.3); box-shadow: 0 0 24px rgba(0,229,255,0.12); }
        }
        @keyframes dashFloat {
          0%,100% { transform: translateY(0) rotate(0deg); }
          33%     { transform: translateY(-14px) rotate(0.5deg); }
          66%     { transform: translateY(-6px) rotate(-0.5deg); }
        }
        .btn-shine {
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
        }
        .btn-shine::before {
          content: '';
          position: absolute;
          top: -50%; left: -120%;
          width: 280%; height: 200%;
          background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%);
          transition: left 0.5s;
        }
        .btn-shine:hover::before { left: 120%; }
        .btn-shine:hover { transform: translateY(-2px); box-shadow: 0 0 40px rgba(0,255,136,0.45) !important; }
      `}</style>

      <ParticleCanvas />
      <LiquidBlobs />

      {/* Floating token logos */}
      <div style={{ position: "fixed", inset: 0, zIndex: 4, pointerEvents: "none" }}>
        {FLOATING_TOKENS.map(t => <FloatingToken key={t.id} token={t} />)}
      </div>

      {/* ── Navbar ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(5,9,18,0.72)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#00ff88,#00c866)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900, color: "#050912",
              boxShadow: "0 0 20px rgba(0,255,136,0.4)",
            }}>A</div>
            <span style={{
              fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
              background: "linear-gradient(135deg,#fff 60%,rgba(255,255,255,0.55))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>ATEX</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20,
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.25)",
              color: "#00ff88", fontWeight: 700, letterSpacing: 1,
            }}>PRO</span>
          </div>

          <div style={{ display: "flex", gap: 2 }}>
            {["Markets", "Trade", "Earn", "Launchpad"].map(item => (
              <a key={item} href="#" style={{
                padding: "8px 16px", borderRadius: 8,
                color: "rgba(255,255,255,0.48)", fontSize: 14, fontWeight: 500, textDecoration: "none",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.48)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >{item}</a>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              padding: "9px 20px", borderRadius: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Log In</button>
            <button className="btn-shine" style={{
              padding: "9px 22px", borderRadius: 10,
              background: "linear-gradient(135deg,#00ff88,#00c866)",
              border: "none", color: "#050912",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 0 24px rgba(0,255,136,0.3)",
            }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Ticker */}
      <TickerRow />

      {/* ── Hero ── */}
      <section style={{ position: "relative", zIndex: 5, padding: "90px 40px 60px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>

          {/* Live badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 18px", borderRadius: 50, marginBottom: 32,
            background: "rgba(0,255,136,0.07)",
            border: "1px solid rgba(0,255,136,0.2)",
            animation: "borderGlow 3s ease-in-out infinite",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88", animation: "glowPulse 2s ease-in-out infinite" }} />
            <span style={{ color: "#00ff88", fontSize: 13, fontWeight: 600 }}>Live · 127,438 traders online</span>
          </div>

          <h1 style={{
            fontSize: "clamp(44px,6.5vw,76px)",
            fontWeight: 900, lineHeight: 1.06, letterSpacing: -2.5,
            marginBottom: 24, maxWidth: 820,
          }}>
            <span style={{
              background: "linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.55))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>The Future of</span>
            <br />
            <span style={{
              background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7,#00ff88)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmerText 4s linear infinite",
            }}>Crypto Trading</span>
            <br />
            <span style={{
              background: "linear-gradient(180deg,#fff 40%,rgba(255,255,255,0.55))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Starts Here</span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.7, color: "rgba(255,255,255,0.4)", maxWidth: 520, marginBottom: 44 }}>
            Trade 200+ cryptocurrencies with the speed, security and intelligence of a professional-grade exchange — designed for everyone.
          </p>

          <div style={{ display: "flex", gap: 14, marginBottom: 72 }}>
            <button className="btn-shine" style={{
              padding: "16px 38px", borderRadius: 14,
              background: "linear-gradient(135deg,#00ff88,#00c866)",
              border: "none", color: "#050912",
              fontSize: 16, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 0 30px rgba(0,255,136,0.32), 0 4px 24px rgba(0,0,0,0.4)",
            }}>Start Trading Free →</button>
            <button style={{
              padding: "16px 36px", borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.11)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 16, fontWeight: 600, cursor: "pointer",
              backdropFilter: "blur(12px)",
              transition: "all 0.3s",
            }}>▶ Watch Demo</button>
          </div>

          {/* Floating dashboard card */}
          <div style={{
            width: "100%", maxWidth: 840,
            borderRadius: 28,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(36px)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 60px rgba(0,255,136,0.04), inset 0 1px 0 rgba(255,255,255,0.07)",
            padding: 32,
            animation: "dashFloat 9s ease-in-out infinite",
            position: "relative", overflow: "hidden",
          }}>
            {/* Inner glow */}
            <div style={{
              position: "absolute", top: 0, left: "25%", right: "25%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,255,136,0.4), transparent)",
            }} />
            <div style={{
              position: "absolute", inset: 0, borderRadius: 28, pointerEvents: "none",
              background: "radial-gradient(circle at 50% 0%, rgba(0,255,136,0.04) 0%, transparent 60%)",
            }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>BTC / USDT · 1H</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1.5, color: "#fff" }}>
                  $83,412<span style={{ fontSize: 20, color: "rgba(255,255,255,0.35)" }}>.00</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.22)", color: "#00ff88", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>▲ +2.34%</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>24h vol $2.4B</div>
              </div>
            </div>

            <MiniChart />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
              {[
                { label: "24h Volume", value: "$2.4B",  color: "#00e5ff" },
                { label: "24h High",   value: "$84,720", color: "#00ff88" },
                { label: "24h Low",    value: "$81,350", color: "#f87171" },
                { label: "Open Int.",  value: "$18.2B",  color: "#a855f7" },
              ].map(s => (
                <div key={s.label} style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ position: "relative", zIndex: 5, padding: "20px 40px 60px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          {[
            { v: "$4.2B", l: "Daily Volume", s: "Across all pairs" },
            { v: "200+",  l: "Trading Pairs", s: "Spot & derivatives" },
            { v: "98ms",  l: "Order Speed",  s: "Average execution" },
            { v: "850K+", l: "Active Traders", s: "In 150+ countries" },
          ].map(s => (
            <div key={s.l} style={{
              padding: "28px 24px", borderRadius: 20, textAlign: "center",
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>
              <div style={{
                fontSize: 34, fontWeight: 900, marginBottom: 6, letterSpacing: -1,
                background: "linear-gradient(135deg,#00ff88,#00e5ff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{s.v}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.75)", marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: "relative", zIndex: 5, padding: "20px 40px 80px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontSize: 42, fontWeight: 900, letterSpacing: -1.5, marginBottom: 12,
              background: "linear-gradient(180deg,#fff 50%,rgba(255,255,255,0.45))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Built for Performance</h2>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>Enterprise-grade infrastructure, consumer-friendly design</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            <GlassCard icon="⚡" title="Ultra-Low Latency" desc="Sub-ms order execution with our matching engine" glow="#00ff88" />
            <GlassCard icon="🔐" title="Military Security" desc="HD wallets, cold storage, 2FA & multi-sig" glow="#00e5ff" />
            <GlassCard icon="🌐" title="Multi-Chain" desc="ETH, BSC, Polygon — one account, all networks" glow="#a855f7" />
            <GlassCard icon="📊" title="Pro Analytics" desc="Real-time charts, order books & depth data" glow="#f59e0b" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 5, padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{
            borderRadius: 32, padding: "64px",
            background: "linear-gradient(135deg,rgba(0,255,136,0.07) 0%,rgba(0,229,255,0.04) 50%,rgba(168,85,247,0.07) 100%)",
            border: "1px solid rgba(0,255,136,0.14)",
            backdropFilter: "blur(30px)",
            textAlign: "center", position: "relative", overflow: "hidden",
            boxShadow: "0 0 80px rgba(0,255,136,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            <div style={{
              position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)",
              width: 400, height: 160,
              background: "radial-gradient(ellipse,rgba(0,255,136,0.1) 0%,transparent 70%)",
              filter: "blur(20px)",
            }} />
            <h2 style={{
              fontSize: 46, fontWeight: 900, letterSpacing: -1.5, marginBottom: 14,
              background: "linear-gradient(135deg,#fff 60%,rgba(255,255,255,0.65))",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", position: "relative",
            }}>Ready to trade smarter?</h2>
            <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 17, marginBottom: 38, position: "relative" }}>
              Join 850,000+ traders. No fees for the first 30 days.
            </p>
            <button className="btn-shine" style={{
              padding: "18px 52px", borderRadius: 14,
              background: "linear-gradient(135deg,#00ff88,#00c866)",
              border: "none", color: "#050912",
              fontSize: 18, fontWeight: 900, cursor: "pointer",
              boxShadow: "0 0 40px rgba(0,255,136,0.38), 0 8px 32px rgba(0,0,0,0.4)",
              position: "relative",
            }}>Create Free Account →</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 5,
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 40px",
        background: "rgba(5,9,18,0.85)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#00ff88,#00e5ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#050912" }}>A</div>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© 2026 ATEX Exchange</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Support", "API Docs"].map(l => (
            <a key={l} href="#" style={{ color: "rgba(255,255,255,0.28)", fontSize: 13, textDecoration: "none" }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}
