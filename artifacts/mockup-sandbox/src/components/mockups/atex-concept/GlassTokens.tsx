/**
 * ATEX — 3D Glass Token Variants
 * Three design options for the floating token cards
 */

/* ────────────────────────────────────────────────────────────── */
/*  Shared token data                                            */
/* ────────────────────────────────────────────────────────────── */
const TOKENS = [
  { sym: "BTC", label: "Bitcoin",  color1: "#F7931A", color2: "#FFD080", color3: "#b35d00" },
  { sym: "ETH", label: "Ethereum", color1: "#627EEA", color2: "#a0bfff", color3: "#2a4ab0" },
  { sym: "BNB", label: "BNB",      color1: "#F0B90B", color2: "#FFE566", color3: "#a07800" },
  { sym: "SOL", label: "Solana",   color1: "#9945FF", color2: "#c084fc", color3: "#5c1dc9" },
  { sym: "POL", label: "Polygon",  color1: "#8247E5", color2: "#b084f8", color3: "#4a1fa0" },
];

/* Minimal clean SVG paths for each symbol */
const PATHS: Record<string, string> = {
  BTC: "M16 5l-6.5 11.5L16 20l6.5-3.5L16 5zM9.5 16.5L16 20l6.5-3.5-6.5 10.5-6.5-10.5z",
  ETH: "M16 5l-6.5 11.5L16 20l6.5-3.5L16 5zM9.5 16.5L16 20l6.5-3.5-6.5 10.5-6.5-10.5z",
  BNB: "M16 9l2.5 2.5L16 14l-2.5-2.5L16 9zM9 16l2.5-2.5 2.5 2.5-2.5 2.5L9 16zM23 16l-2.5 2.5-2.5-2.5 2.5-2.5L23 16zM16 18.5l2.5 2.5L16 23.5l-2.5-2.5L16 18.5z",
  SOL: "M8 20.5h13.5l-2.5 2.5H8l2.5-2.5zM8 14.8h13.5l2.5-2.5H10.5L8 14.8zM21.5 9H8l2.5 2.5H24L21.5 9z",
  POL: "M20 12l-4-2.3-4 2.3v4.6l4 2.3 4-2.3V12zm-4-4l7 4v8l-7 4-7-4v-8l7-4z",
};

const BTC_PATH = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";

function getPath(sym: string) {
  if (sym === "BTC") return BTC_PATH;
  return PATHS[sym] || PATHS.ETH;
}

/* ────────────────────────────────────────────────────────────── */
/*  Variant A — Crystal Prism                                    */
/*  Faceted gem shape, refractive planes, chromatic edges        */
/* ────────────────────────────────────────────────────────────── */
function CrystalGem({ sym, color1, color2, color3 }: { sym: string; color1: string; color2: string; color3: string }) {
  const id = `cg-${sym}`;
  return (
    <div style={{ width: 120, height: 148, position: "relative", filter: `drop-shadow(0 18px 32px ${color1}55) drop-shadow(0 0 60px ${color1}22)` }}>
      <style>{`
        @keyframes ${id}-spin { 0%,100%{transform:rotateY(0deg) rotateX(8deg)} 25%{transform:rotateY(12deg) rotateX(4deg)} 50%{transform:rotateY(0deg) rotateX(12deg)} 75%{transform:rotateY(-12deg) rotateX(4deg)} }
        @keyframes ${id}-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
      <div style={{ animation: `${id}-bob 4s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{ animation: `${id}-spin 8s ease-in-out infinite`, transformStyle: "preserve-3d", perspective: 500 }}>
          <svg viewBox="0 0 120 148" style={{ width: 120, height: 148, overflow: "visible" }}>
            <defs>
              <linearGradient id={`${id}-top`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={color2} stopOpacity="0.9" />
                <stop offset="60%" stopColor={color1} stopOpacity="0.7" />
                <stop offset="100%" stopColor={color3} stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id={`${id}-left`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color3} stopOpacity="0.7" />
                <stop offset="100%" stopColor={color1} stopOpacity="0.45" />
              </linearGradient>
              <linearGradient id={`${id}-right`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={color1} stopOpacity="0.55" />
                <stop offset="100%" stopColor={color2} stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id={`${id}-bot`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color1} stopOpacity="0.5" />
                <stop offset="100%" stopColor={color3} stopOpacity="0.3" />
              </linearGradient>
              <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="1.5"/></filter>
            </defs>

            {/* Shadow */}
            <ellipse cx="60" cy="145" rx="36" ry="5" fill={color1} opacity="0.2" filter={`url(#${id}-blur)`} />

            {/* Bottom inverted gem (reflection) */}
            <polygon points="60,148 20,100 100,100" fill={`url(#${id}-bot)`} />
            <polygon points="60,148 20,100 60,112" fill="rgba(0,0,0,0.15)" />
            <polygon points="60,148 100,100 60,112" fill="rgba(255,255,255,0.08)" />

            {/* Waist / girdle */}
            <polygon points="20,100 38,88 82,88 100,100" fill={color1} opacity="0.35" />

            {/* Upper facets */}
            {/* Back center */}
            <polygon points="60,10 38,88 82,88" fill={`url(#${id}-top)`} />
            {/* Left face */}
            <polygon points="60,10 20,58 38,88" fill={`url(#${id}-left)`} />
            {/* Right face */}
            <polygon points="60,10 100,58 82,88" fill={`url(#${id}-right)`} />
            {/* Left-mid */}
            <polygon points="20,58 38,88 20,100" fill={color3} opacity="0.55" />
            {/* Right-mid */}
            <polygon points="100,58 82,88 100,100" fill={color2} opacity="0.45" />

            {/* Specular highlight */}
            <polygon points="60,10 75,48 60,44 48,42" fill="white" opacity="0.22" />
            <polygon points="60,10 48,42 60,44 52,28" fill="white" opacity="0.35" />
            {/* Edge glint */}
            <line x1="60" y1="10" x2="38" y2="88" stroke="white" strokeWidth="0.6" opacity="0.4" />
            <line x1="60" y1="10" x2="82" y2="88" stroke={color2} strokeWidth="0.5" opacity="0.3" />

            {/* Token symbol inside */}
            <g transform="translate(44, 34) scale(1.35)">
              <path d={getPath(sym)} fill="white" opacity="0.85" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Variant B — Liquid Glass Orb                                 */
/*  Morphing blob, fluid refraction, iridescent sheen           */
/* ────────────────────────────────────────────────────────────── */
function LiquidOrb({ sym, color1, color2, color3 }: { sym: string; color1: string; color2: string; color3: string }) {
  const id = `lo-${sym}`;
  return (
    <div style={{ width: 120, height: 130, position: "relative" }}>
      <style>{`
        @keyframes ${id}-morph {
          0%,100%{border-radius:62% 38% 54% 46%/52% 60% 40% 48%}
          25%    {border-radius:44% 56% 38% 62%/60% 44% 56% 40%}
          50%    {border-radius:56% 44% 64% 36%/38% 56% 44% 62%}
          75%    {border-radius:38% 62% 46% 54%/56% 40% 60% 44%}
        }
        @keyframes ${id}-shine {
          0%,100%{opacity:.55;transform:translate(-30%,-30%) rotate(0deg)}
          50%    {opacity:.85;transform:translate(-20%,-20%) rotate(15deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes ${id}-rot { 0%{transform:rotateZ(0deg)} 100%{transform:rotateZ(360deg)} }
      `}</style>
      <div style={{ animation: `${id}-bob 5s ease-in-out infinite` }}>
        {/* Outer glow halo */}
        <div style={{ position: "absolute", inset: -12, borderRadius: "50%", background: `radial-gradient(circle,${color1}30 0%,transparent 70%)`, filter: "blur(8px)", animation: `${id}-morph 6s ease-in-out infinite` }} />

        {/* Main blob */}
        <div style={{
          width: 120, height: 120, position: "relative", overflow: "hidden",
          animation: `${id}-morph 6s ease-in-out infinite`,
          background: `
            radial-gradient(circle at 35% 30%, ${color2}cc 0%, transparent 55%),
            radial-gradient(circle at 70% 70%, ${color3}99 0%, transparent 55%),
            radial-gradient(circle at 50% 50%, ${color1}88 0%, transparent 80%)
          `,
          boxShadow: `
            0 0 0 1px ${color2}55,
            0 8px 32px ${color1}55,
            inset 0 2px 12px ${color2}88,
            inset 0 -4px 16px ${color3}66
          `,
        }}>
          {/* Inner liquid swirl */}
          <div style={{
            position: "absolute", width: "180%", height: "180%", top: "-40%", left: "-40%",
            background: `conic-gradient(from 0deg, ${color2}44, transparent 40%, ${color1}33, transparent 70%, ${color2}44)`,
            animation: `${id}-rot 12s linear infinite`,
          }} />

          {/* Specular highlight — top left */}
          <div style={{
            position: "absolute", width: "55%", height: "45%", top: "8%", left: "10%",
            background: "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 60%, transparent 100%)",
            borderRadius: "50%",
            animation: `${id}-shine 4s ease-in-out infinite`,
          }} />

          {/* Refraction line */}
          <div style={{ position: "absolute", width: "100%", height: 1, top: "50%", background: `linear-gradient(90deg, transparent, ${color2}88, transparent)`, transform: "rotate(-25deg)", opacity: 0.6 }} />

          {/* Token symbol */}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 32 32" style={{ width: 44, height: 44, filter: `drop-shadow(0 0 8px ${color2}) drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}>
              <path d={getPath(sym)} fill="white" opacity="0.95" />
            </svg>
          </div>
        </div>

        {/* Puddle reflection below */}
        <div style={{
          width: 100, height: 16, margin: "6px auto 0", borderRadius: "50%",
          background: `radial-gradient(ellipse, ${color1}44 0%, transparent 70%)`,
          filter: "blur(4px)", transform: "scaleY(0.5)",
        }} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Variant C — 3D Glass Slab                                    */
/*  Extruded symbol in refractive glass, chromatic aberration   */
/* ────────────────────────────────────────────────────────────── */
function GlassSlab({ sym, color1, color2, color3 }: { sym: string; color1: string; color2: string; color3: string }) {
  const id = `gs-${sym}`;
  const w = 110, h = 130;
  return (
    <div style={{ width: w, height: h, position: "relative", perspective: 600 }}>
      <style>{`
        @keyframes ${id}-tilt {
          0%,100%{transform:rotateY(-14deg) rotateX(8deg)}
          33%    {transform:rotateY(10deg)  rotateX(4deg)}
          66%    {transform:rotateY(-6deg)  rotateX(12deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
      <div style={{ animation: `${id}-bob 4.5s ease-in-out infinite` }}>
        <div style={{
          width: w, height: h,
          animation: `${id}-tilt 7s ease-in-out infinite`,
          transformStyle: "preserve-3d", position: "relative",
        }}>
          {/* ── MAIN FACE ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 20,
            background: `
              linear-gradient(145deg, ${color2}55 0%, ${color1}44 35%, transparent 60%, ${color3}55 100%)
            `,
            backdropFilter: "blur(2px)",
            border: `1.5px solid ${color2}88`,
            boxShadow: `
              inset 0 1px 0 rgba(255,255,255,0.55),
              inset 0 -1px 0 rgba(0,0,0,0.3),
              inset -1px 0 0 ${color2}44,
              0 20px 60px ${color1}44,
              0 2px 8px rgba(0,0,0,0.5)
            `,
            overflow: "hidden",
          }}>
            {/* Internal prismatic bands */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent 20%, ${color2}28 35%, rgba(255,255,255,0.12) 40%, transparent 55%, ${color1}18 70%, transparent 85%)` }} />

            {/* Top specular stripe */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "38%", background: `linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 100%)`, borderRadius: "20px 20px 50% 50%", pointerEvents: "none" }} />

            {/* Chromatic aberration lines */}
            <div style={{ position: "absolute", top: "20%", left: "-5%", right: "-5%", height: 1, background: `linear-gradient(90deg, transparent, ${color2}66, rgba(255,255,255,0.4), ${color1}55, transparent)`, transform: "rotate(-3deg)" }} />
            <div style={{ position: "absolute", top: "23%", left: "-5%", right: "-5%", height: 1, background: `linear-gradient(90deg, transparent, ${color3}44, rgba(255,255,255,0.2), transparent)`, transform: "rotate(-3deg)" }} />

            {/* Symbol — rendered as "glass" with shadow offset for depth illusion */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Depth shadow layers (extruded glass effect) */}
              {[3, 2, 1].map(d => (
                <svg key={d} viewBox="0 0 32 32" style={{
                  position: "absolute", width: 64, height: 64,
                  transform: `translate(${d * 1.5}px, ${d * 2}px)`,
                  filter: `blur(${d * 0.5}px)`,
                  opacity: 0.15,
                }}>
                  <path d={getPath(sym)} fill={color3} />
                </svg>
              ))}
              {/* Main symbol */}
              <svg viewBox="0 0 32 32" style={{ width: 64, height: 64, filter: `drop-shadow(0 0 12px ${color2}cc) drop-shadow(0 4px 8px rgba(0,0,0,0.4))`, position: "relative" }}>
                <defs>
                  <linearGradient id={`${id}-symg`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color2} />
                    <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
                    <stop offset="100%" stopColor={color1} />
                  </linearGradient>
                </defs>
                <path d={getPath(sym)} fill={`url(#${id}-symg)`} />
              </svg>
            </div>

            {/* Bottom label */}
            <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>{sym}</div>
          </div>

          {/* ── RIGHT EDGE (thickness) ── */}
          <div style={{
            position: "absolute", top: 4, bottom: 4, right: -8, width: 8,
            background: `linear-gradient(90deg, ${color1}88, ${color3}55)`,
            borderRadius: "0 4px 4px 0",
            transform: "rotateY(90deg)",
            transformOrigin: "left center",
          }} />
          {/* ── BOTTOM EDGE ── */}
          <div style={{
            position: "absolute", bottom: -8, left: 4, right: 4, height: 8,
            background: `linear-gradient(180deg, ${color1}66, ${color3}44)`,
            borderRadius: "0 0 4px 4px",
            transform: "rotateX(-90deg)",
            transformOrigin: "top center",
          }} />
        </div>

        {/* Floor shadow */}
        <div style={{ width: 80, height: 12, margin: "4px auto 0", borderRadius: "50%", background: `radial-gradient(ellipse,${color1}44 0%,transparent 80%)`, filter: "blur(6px)" }} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Main export — comparison layout                             */
/* ────────────────────────────────────────────────────────────── */
export default function GlassTokens() {
  return (
    <div style={{ minHeight: "100vh", background: "#070b14", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 6, background: "linear-gradient(90deg,#00ff88,#00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          3D Glass Token — варианты дизайна
        </h1>
        <p style={{ textAlign: "center", color: "rgba(255,255,255,.4)", marginBottom: 48, fontSize: 14 }}>Выбери стиль, который заменит летающие плашки</p>

        {/* ── VARIANT A ── */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(0,255,136,.3),transparent)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#00ff88", letterSpacing: 2, textTransform: "uppercase" }}>Вариант A — Crystal Prism</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(270deg,rgba(0,255,136,.3),transparent)" }} />
          </div>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, marginBottom: 24 }}>Кристальные грани, преломление, как на референсе с ETH</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {TOKENS.map(t => (
              <div key={t.sym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <CrystalGem {...t} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: 1 }}>{t.sym}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── VARIANT B ── */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(0,229,255,.3),transparent)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#00e5ff", letterSpacing: 2, textTransform: "uppercase" }}>Вариант B — Liquid Glass Orb</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(270deg,rgba(0,229,255,.3),transparent)" }} />
          </div>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, marginBottom: 24 }}>Жидкая морфирующая форма, иридесцентный блеск, органичная анимация</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {TOKENS.map(t => (
              <div key={t.sym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <LiquidOrb {...t} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: 1 }}>{t.sym}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── VARIANT C ── */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(168,85,247,.3),transparent)" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#a855f7", letterSpacing: 2, textTransform: "uppercase" }}>Вариант C — 3D Glass Slab</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(270deg,rgba(168,85,247,.3),transparent)" }} />
          </div>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: 13, marginBottom: 24 }}>Стеклянная плита с 3D наклоном, хроматические аберрации, как референс BTC</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {TOKENS.map(t => (
              <div key={t.sym} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <GlassSlab {...t} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 600, letterSpacing: 1 }}>{t.sym}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "24px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", color: "rgba(255,255,255,.35)", fontSize: 13 }}>
          Скажи "A", "B" или "C" — и применю выбранный вариант на биржу
        </div>
      </div>
    </div>
  );
}
