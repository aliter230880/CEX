/**
 * ATEX — 3D volumetric glass token logos v3
 * Fixed SOL (parallelogram bars) + BNB (5-diamond cross)
 * Liquid pouring animation inside shapes
 * More glass depth, caustic, chromatic aberration
 */

/* ─── Token data ─────────────────────────────────────────────── */
const TOKENS = [
  { sym: "BTC", hi: "#FFE0A0", mid: "#F7931A", lo: "#7a3a00", glow: "#F7931A", liq: "#F7931Aaa" },
  { sym: "ETH", hi: "#c4d8ff", mid: "#627EEA", lo: "#1a2e88", glow: "#627EEA", liq: "#627EEAaa" },
  { sym: "BNB", hi: "#FFF0A0", mid: "#F0B90B", lo: "#7a5500", glow: "#F0B90B", liq: "#F0B90Baa" },
  { sym: "SOL", hi: "#a0ffec", mid: "#9945FF", lo: "#2e0e70", glow: "#9945FF", liq: "#9945FFaa" },
  { sym: "POL", hi: "#d4bfff", mid: "#8247E5", lo: "#2e0e80", glow: "#8247E5", liq: "#8247E5aa" },
];

/* ─── Corrected SVG paths (32×32 viewBox) ──────────────────────
   BTC: official bitcoin "₿" path
   ETH: separate face polygons for 3D decomposition
   BNB: 5-diamond cross (correct BNB logo)
   SOL: 3 parallelogram bars (correct Solana logo)
   POL: hexagon network shape
────────────────────────────────────────────────────────────── */
const BTC_PATH = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";

// BNB: 5 diamonds in cross pattern (top, left, center, right, bottom)
const BNB_PATH = [
  "M16,4   L19.5,8  L16,12  L12.5,8  Z",   // top diamond
  "M4,16   L8,12.5  L12,16  L8,19.5  Z",   // left diamond
  "M28,16  L24,12.5 L20,16  L24,19.5 Z",   // right diamond
  "M16,28  L12.5,24 L16,20  L19.5,24 Z",   // bottom diamond
  "M12,16  L16,12   L20,16  L16,20   Z",   // center diamond
].join(" ");

// SOL: 3 parallelogram bars (official Solana proportions, 32×32 viewbox)
const SOL_BARS = [
  "M4.24,10.5  L24.43,10.5  L27.76,7    L7.57,7    Z",  // top bar
  "M4.24,17    L24.43,17    L27.76,13.5 L7.57,13.5 Z",  // mid bar
  "M4.24,23.5  L24.43,23.5  L27.76,20   L7.57,20   Z",  // bottom bar
].join(" ");

// ETH faces for 3D decomposition
const ETH_TOP = "M16,4  L8,16  L16,20  L24,16  Z";
const ETH_BOT = "M8,17.5 L16,21.5 L24,17.5 L16,29 Z";
const ETH_LF  = "M16,4  L8,16  L16,12 Z";
const ETH_RF  = "M16,4  L24,16 L16,12 Z";
const ETH_LB  = "M8,17.5 L16,21.5 L16,13 Z";
const ETH_RB  = "M24,17.5 L16,21.5 L16,13 Z";

const POL_PATH = "M20,12 L16,9.7 L12,12 L12,16.6 L16,18.9 L20,16.6 Z M16,5 L23,9 L23,17 L16,21 L9,17 L9,9 Z";

function getPath(sym: string) {
  if (sym === "BTC") return BTC_PATH;
  if (sym === "BNB") return BNB_PATH;
  if (sym === "SOL") return SOL_BARS;
  if (sym === "POL") return POL_PATH;
  return `${ETH_TOP} ${ETH_BOT}`;
}

/* ─── Liquid fill (slow slosh inside clip) ───────────────────── */
function LiquidFill({ id, color, hi }: { id: string; color: string; hi: string }) {
  return (
    <>
      <style>{`
        @keyframes ${id}-slosh {
          0%,100%{transform:translateX(0px)   translateY(0px)   rotate(-2deg)}
          25%    {transform:translateX(6px)    translateY(-4px)  rotate(1.5deg)}
          50%    {transform:translateX(-2px)   translateY(-8px)  rotate(-3deg)}
          75%    {transform:translateX(-6px)   translateY(-3px)  rotate(2deg)}
        }
        @keyframes ${id}-surface {
          0%,100%{transform:translateX(0px)  scaleY(1)   }
          33%    {transform:translateX(5px)   scaleY(0.85)}
          66%    {transform:translateX(-5px)  scaleY(1.1) }
        }
        @keyframes ${id}-bubble {
          0%,100%{opacity:.25;transform:translateY(0)   scale(1)  }
          50%    {opacity:.55;transform:translateY(-6px) scale(1.2)}
        }
        @keyframes ${id}-glow {
          0%,100%{opacity:.35} 50%{opacity:.65}
        }
      `}</style>

      {/* Deep liquid body */}
      <g style={{ animation: `${id}-slosh 8s ease-in-out infinite` }}>
        <ellipse cx="16" cy="26" rx="18" ry="14"
          fill={color} opacity="0.45"
          style={{ filter: "blur(0.4px)" }}/>
      </g>

      {/* Mid liquid layer (slightly different phase) */}
      <g style={{ animation: `${id}-slosh 8s ease-in-out infinite`, animationDelay: "-2s" }}>
        <ellipse cx="16" cy="22" rx="14" ry="10"
          fill={hi} opacity="0.18"
          style={{ filter: "blur(0.6px)" }}/>
      </g>

      {/* Surface shimmer */}
      <g style={{ animation: `${id}-surface 6s ease-in-out infinite`, transformOrigin: "16px 18px" }}>
        <ellipse cx="16" cy="18" rx="13" ry="2.5"
          fill="white" opacity="0.22"
          style={{ filter: "blur(0.3px)" }}/>
        <ellipse cx="14" cy="17.5" rx="5" ry="1"
          fill="white" opacity="0.35"/>
      </g>

      {/* Rising bubble 1 */}
      <g style={{ animation: `${id}-bubble 5s ease-in-out infinite` }}>
        <circle cx="12" cy="15" r="1.2" fill="white" opacity="0.22"/>
      </g>
      {/* Rising bubble 2 */}
      <g style={{ animation: `${id}-bubble 7s ease-in-out infinite`, animationDelay: "-2s" }}>
        <circle cx="19" cy="18" r="0.8" fill="white" opacity="0.18"/>
      </g>

      {/* Inner glow pulse */}
      <ellipse cx="16" cy="20" rx="10" ry="8"
        fill={color} opacity="0"
        style={{ animation: `${id}-glow 4s ease-in-out infinite`, filter: "blur(2px)" }}/>
    </>
  );
}

/* ─── Shared glass token renderer ────────────────────────────── */
function GlassToken3D({
  sym, hi, mid, lo, glow, liq,
  variant,
}: typeof TOKENS[0] & { variant: "A" | "B" | "C" }) {
  const id = `gt-${variant.toLowerCase()}-${sym.toLowerCase()}`;
  const S = 210;

  /* ETH gets special facet treatment in variant A */
  const isETH = sym === "ETH";
  const path = getPath(sym);

  /* Per-variant timing for bob/rock */
  const bobDur   = variant === "A" ? 5.2 : variant === "B" ? 4.8 : 6;
  const rockDur  = variant === "A" ? 9   : variant === "B" ? 8   : 11;
  const liqSpeed = variant === "C" ? 10  : 7;

  /* Glass tint: A=cold blue, B=neutral clear, C=warm iridescent */
  const glassA = `rgba(80,150,255,0.22)`;
  const glassC = `rgba(255,200,100,0.12)`;
  const glassMid = variant === "A" ? glassA : variant === "C" ? glassC : "rgba(255,255,255,0.08)";

  return (
    <div style={{
      width: S, height: S,
      filter: `drop-shadow(0 26px 50px ${glow}77) drop-shadow(0 0 90px ${glow}44) drop-shadow(0 0 140px ${glow}22)`,
    }}>
      <style>{`
        @keyframes ${id}-rock {
          0%,100%{transform:rotateY(-16deg) rotateX(10deg)}
          25%    {transform:rotateY(12deg)  rotateX(4deg)}
          50%    {transform:rotateY(-4deg)  rotateX(14deg)}
          75%    {transform:rotateY(10deg)  rotateX(6deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes ${id}-liqrock {
          0%,100%{transform:translateX(0)   translateY(0)}
          25%    {transform:translateX(7px)  translateY(-5px)}
          50%    {transform:translateX(-3px) translateY(-9px)}
          75%    {transform:translateX(-7px) translateY(-4px)}
        }
      `}</style>

      <div style={{ animation: `${id}-bob ${bobDur}s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{
          animation: `${id}-rock ${rockDur}s ease-in-out infinite`,
          transformStyle: "preserve-3d", perspective: 700, width: S, height: S,
        }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              {/* === Gradients === */}
              <linearGradient id={`${id}-g-main`} x1="0.15" y1="0" x2="0.85" y2="1">
                <stop offset="0%"   stopColor={hi}  stopOpacity="0.95"/>
                <stop offset="35%"  stopColor={mid}  stopOpacity="0.8"/>
                <stop offset="70%"  stopColor={mid}  stopOpacity="0.6"/>
                <stop offset="100%" stopColor={lo}   stopOpacity="0.85"/>
              </linearGradient>

              <radialGradient id={`${id}-g-cau1`} cx="28%" cy="22%" r="42%">
                <stop offset="0%"   stopColor="white" stopOpacity="0.75"/>
                <stop offset="45%"  stopColor={hi}    stopOpacity="0.35"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={`${id}-g-cau2`} cx="72%" cy="75%" r="32%">
                <stop offset="0%"   stopColor={hi}   stopOpacity="0.5"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={`${id}-g-cau3`} cx="50%" cy="50%" r="55%">
                <stop offset="0%"   stopColor={mid}  stopOpacity="0.2"/>
                <stop offset="100%" stopColor={lo}   stopOpacity="0.05"/>
              </radialGradient>

              <linearGradient id={`${id}-g-rim`} x1="0" y1="0" x2="0.7" y2="1">
                <stop offset="0%"   stopColor="white"  stopOpacity="1"/>
                <stop offset="40%"  stopColor={hi}     stopOpacity="0.6"/>
                <stop offset="100%" stopColor={mid}    stopOpacity="0.1"/>
              </linearGradient>

              {/* Chromatic aberration gradients */}
              <linearGradient id={`${id}-g-chr-r`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff6666" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id={`${id}-g-chr-b`} x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor="#6666ff" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </linearGradient>

              {/* Glass tint for inner body */}
              <radialGradient id={`${id}-g-tint`} cx="50%" cy="45%" r="60%">
                <stop offset="0%"   stopColor={glassMid}/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>

              {/* Filters */}
              <filter id={`${id}-f-glow`}>
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
              <filter id={`${id}-f-bloom`}><feGaussianBlur stdDeviation="1.8"/></filter>
              <filter id={`${id}-f-soft`}><feGaussianBlur stdDeviation="0.35"/></filter>
              <filter id={`${id}-f-liquid`}><feGaussianBlur stdDeviation="0.5"/></filter>

              {/* ClipPath for liquid */}
              <clipPath id={`${id}-clip`}><path d={path}/></clipPath>
              {isETH && (
                <clipPath id={`${id}-clip-eth`}>
                  <path d={`${ETH_TOP} ${ETH_BOT}`}/>
                </clipPath>
              )}
            </defs>

            {/* ── 1. Back bloom glow ── */}
            <g filter={`url(#${id}-f-bloom)`} opacity="0.6">
              <path d={path} fill={mid} transform="scale(1.06) translate(-0.96,-0.96)"/>
            </g>

            {/* ── 2. Extrusion depth stack (thickness) ── */}
            {[4, 3, 2, 1].map(d => (
              <path key={d} d={path}
                fill={lo} opacity={0.28 - d * 0.05}
                transform={`translate(${d * 0.75}, ${d * 1.0})`}
                filter={d === 4 ? `url(#${id}-f-soft)` : undefined}
              />
            ))}

            {/* ── 3. LIQUID FILL (inside clip) ── */}
            <g clipPath={`url(#${id}-clip)`}
              style={{ animation: `${id}-liqrock ${liqSpeed}s ease-in-out infinite` }}>
              <LiquidFill id={`${id}-liq`} color={liq} hi={hi} />
            </g>

            {/* ── 4. Main glass body ── */}
            <path d={path} fill={`url(#${id}-g-main)`} opacity="0.78"/>

            {/* ── 5. Glass tint (variant-specific) ── */}
            <path d={path} fill={`url(#${id}-g-tint)`} opacity="0.55"/>

            {/* ── 6. ETH special: 3D face decomposition ── */}
            {isETH && (
              <g>
                <path d={ETH_LF}  fill={hi}   opacity="0.35"/>
                <path d={ETH_RF}  fill={lo}   opacity="0.28"/>
                <path d={ETH_TOP} fill={mid}   opacity="0.15"/>
                <path d={ETH_LB}  fill={mid}   opacity="0.2"/>
                <path d={ETH_RB}  fill={lo}   opacity="0.15"/>
                <line x1="16" y1="4"  x2="8"  y2="16" stroke="white" strokeWidth="0.35" opacity="0.6"/>
                <line x1="16" y1="4"  x2="24" y2="16" stroke={hi}    strokeWidth="0.2"  opacity="0.4"/>
                <line x1="8"  y1="16" x2="24" y2="16" stroke={hi}    strokeWidth="0.25" opacity="0.5"/>
              </g>
            )}

            {/* ── 7. Prismatic refraction lines (clipped inside) ── */}
            <g clipPath={`url(#${id}-clip)`} opacity="0.4">
              <line x1="-2" y1="11" x2="34" y2="9.5"   stroke="white" strokeWidth="0.45" opacity="0.55"/>
              <line x1="-2" y1="14" x2="34" y2="12.5"  stroke={hi}    strokeWidth="0.25" opacity="0.35"/>
              <line x1="-2" y1="20" x2="34" y2="18.5"  stroke={mid}   strokeWidth="0.2"  opacity="0.25"/>
            </g>

            {/* ── 8. Caustic light spots ── */}
            <path d={path} fill={`url(#${id}-g-cau1)`}/>
            <path d={path} fill={`url(#${id}-g-cau2)`}/>
            <path d={path} fill={`url(#${id}-g-cau3)`}/>

            {/* ── 9. Chromatic aberration fringe ── */}
            <path d={path} fill="none" stroke="rgba(255,80,80,0.18)" strokeWidth="1.2"
              transform="translate(-0.4, 0)" strokeLinecap="round" strokeLinejoin="round"/>
            <path d={path} fill="none" stroke="rgba(80,80,255,0.15)" strokeWidth="1.2"
              transform="translate(0.4, 0)" strokeLinecap="round" strokeLinejoin="round"/>

            {/* ── 10. Top-left glass highlight blob ── */}
            <g clipPath={`url(#${id}-clip)`}>
              <ellipse cx="11.5" cy="9.5" rx="5.5" ry="3.8"
                fill="white" opacity="0.28"
                transform="rotate(-22,11.5,9.5)"
                filter={`url(#${id}-f-soft)`}/>
              <ellipse cx="10.5" cy="8.8" rx="2.5" ry="1.6"
                fill="white" opacity="0.5"
                transform="rotate(-22,10.5,8.8)"/>
            </g>

            {/* ── 11. Rim light (edge glow) ── */}
            <path d={path} fill="none" stroke={`url(#${id}-g-rim)`} strokeWidth="0.55"/>
            <path d={path} fill="none" stroke="white" strokeWidth="0.2" opacity="0.6"/>

            {/* ── 12. Bottom edge refraction (second internal reflection) ── */}
            <g clipPath={`url(#${id}-clip)`}>
              <ellipse cx="16" cy="26" rx="8" ry="2.5"
                fill={hi} opacity="0.22" filter={`url(#${id}-f-soft)`}/>
            </g>

            {/* ── 13. Ground shadow + puddle ── */}
            <ellipse cx="16" cy="31.5" rx="8" ry="1.2"
              fill={glow} opacity="0.22" filter={`url(#${id}-f-soft)`}/>
            <g transform="translate(0, 33.5) scale(1, -0.16)" opacity="0.12"
              filter={`url(#${id}-f-soft)`}>
              <path d={path} fill={mid}/>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── Row label ─────────────────────────────────────────────────── */
function RowLabel({ letter, title, color, desc }: { letter: string; title: string; color: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${color}55,transparent)` }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color }}>
          {letter}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>— {desc}</span>
      </div>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg,${color}55,transparent)` }}/>
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────────── */
export default function GlassTokens() {
  return (
    <div style={{ minHeight: "100vh", background: "#060910", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "36px 20px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            3D Glass Tokens — жидкость внутри
          </h1>
          <p style={{ color: "rgba(255,255,255,.28)", fontSize: 13 }}>
            SOL и BNB исправлены · жидкость переливается внутри каждого символа · скажи A, B или C
          </p>
        </div>

        {/* ── A: холодное стекло ── */}
        <div style={{ marginBottom: 70 }}>
          <RowLabel letter="A" title="Cold Glass" color="#00e5ff"
            desc="холодный синий отлив, кристальная прозрачность"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassToken3D key={t.sym} {...t} variant="A"/>)}
          </div>
        </div>

        {/* ── B: нейтральное чистое стекло ── */}
        <div style={{ marginBottom: 70 }}>
          <RowLabel letter="B" title="Clear Glass" color="#aaaaff"
            desc="нейтральное чистое стекло, максимум каустики"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassToken3D key={t.sym} {...t} variant="B"/>)}
          </div>
        </div>

        {/* ── C: тёплое янтарное стекло ── */}
        <div style={{ marginBottom: 48 }}>
          <RowLabel letter="C" title="Warm Iridescent" color="#a855f7"
            desc="тёплый иридесцентный отлив, золотые переливы"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassToken3D key={t.sym} {...t} variant="C"/>)}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "18px 24px", borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
          Скажи <b style={{ color: "#00e5ff" }}>A</b>, <b style={{ color: "#aaaaff" }}>B</b> или <b style={{ color: "#a855f7" }}>C</b> — применю на биржу + деплой
        </div>
      </div>
    </div>
  );
}
