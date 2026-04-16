/**
 * ATEX — Spinning 3D Glass Coins v4
 * RULE: logo patterns are EXACT and UNCHANGED — only the coin material changes.
 * Each coin = circular disc, scalloped rim, spins rotateY, floats up/down.
 * Material: glass — translucent body, caustic, rim light, liquid inside.
 */

/* ─── Token palette ──────────────────────────────────────────── */
const TOKENS = [
  { sym: "BTC", coinColor: "#F7931A", hi: "#FFE0A0", lo: "#7a3a00", glow: "#F7931A", liq: "#F7931A" },
  { sym: "ETH", coinColor: "#627EEA", hi: "#c4d8ff", lo: "#1a2e88", glow: "#627EEA", liq: "#627EEA" },
  { sym: "BNB", coinColor: "#F0B90B", hi: "#FFF0A0", lo: "#7a5500", glow: "#F0B90B", liq: "#F0B90B" },
  { sym: "SOL", coinColor: "#9945FF", hi: "#a0ffec", lo: "#1a004a", glow: "#9945FF", liq: "#9945FF" },
  { sym: "POL", coinColor: "#8247E5", hi: "#d4bfff", lo: "#2e0e80", glow: "#8247E5", liq: "#8247E5" },
];

/* ─── Logo paths (32×32 viewBox) — UNCHANGED ────────────────── */

// BTC: exact Bitcoin ₿ symbol
const BTC_PATH = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";

// ETH: two stacked rhombus shapes (octahedron projection)
const ETH_PATH = "M16,4 L8,16 L16,20 L24,16 Z M8,17.5 L16,21.5 L24,17.5 L16,29 Z";

// BNB: 5 diamonds in cross pattern — top/left/center/right/bottom
const BNB_PATH = [
  "M16,4   L19.5,8   L16,12  L12.5,8  Z",
  "M4,16   L8,12.5   L12,16  L8,19.5  Z",
  "M28,16  L24,12.5  L20,16  L24,19.5 Z",
  "M16,28  L12.5,24  L16,20  L19.5,24 Z",
  "M12,16  L16,12    L20,16  L16,20   Z",
].join(" ");

// SOL: 3 parallelogram bars (official geometry — both edges diagonal)
//   Bottom-left to bottom-right: horizontal
//   Right/left edges: both angled upward-right by same offset
const SOL_BAR_DEFS = [
  { path: "M5,9    L25,9    L28.5,5.5  L8.5,5.5  Z", from: "#00F0C8", to: "#44D0A8" },  // top: cyan
  { path: "M5,17   L25,17   L28.5,13.5 L8.5,13.5 Z", from: "#6AB8FF", to: "#9945FF" },  // mid: blue→purple
  { path: "M5,25   L25,25   L28.5,21.5 L8.5,21.5 Z", from: "#CC44FF", to: "#FF33AA" },  // bot: purple→pink
];
const SOL_PATH = SOL_BAR_DEFS.map(b => b.path).join(" ");

// POL: double hexagon / network shape
const POL_PATH = "M20,12 L16,9.7 L12,12 L12,16.6 L16,18.9 L20,16.6 Z M16,5 L23,9 L23,17 L16,21 L9,17 L9,9 Z";

function getLogoPath(sym: string): string {
  if (sym === "BTC") return BTC_PATH;
  if (sym === "ETH") return ETH_PATH;
  if (sym === "BNB") return BNB_PATH;
  if (sym === "SOL") return SOL_PATH;
  return POL_PATH;
}

/* ─── Scalloped coin rim (gear shape) ───────────────────────── */
function makeGear(cx: number, cy: number, teeth: number, rO: number, rI: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i * Math.PI) / teeth - Math.PI / 2;
    const r = i % 2 === 0 ? rO : rI;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts[0]} ${pts.slice(1).map(p => `L${p}`).join(" ")} Z`;
}
const COIN_RIM = makeGear(16, 16, 22, 15.6, 14.3);

/* ─── Liquid slosh inside coin ───────────────────────────────── */
function CoinLiquid({ id, color }: { id: string; color: string }) {
  return (
    <>
      <style>{`
        @keyframes ${id}-slosh {
          0%,100%{transform:translateX(0)   translateY(0)  }
          30%    {transform:translateX(4px)  translateY(-3px)}
          60%    {transform:translateX(-4px) translateY(-5px)}
        }
        @keyframes ${id}-surface {
          0%,100%{transform:scaleX(1)   translateX(0)  }
          40%    {transform:scaleX(0.88) translateX(3px) }
          70%    {transform:scaleX(1.08) translateX(-2px)}
        }
        @keyframes ${id}-bubble1 {
          0%,100%{opacity:0;    transform:translateY(0)  }
          50%    {opacity:.5;   transform:translateY(-5px)}
        }
        @keyframes ${id}-bubble2 {
          0%,100%{opacity:0;    transform:translateY(0)  }
          50%    {opacity:.4;   transform:translateY(-4px)}
        }
      `}</style>
      {/* Liquid body */}
      <g style={{ animation: `${id}-slosh 9s ease-in-out infinite` }}>
        <ellipse cx="16" cy="22" rx="14" ry="10" fill={color} opacity="0.55"/>
      </g>
      {/* Liquid surface */}
      <g style={{ animation: `${id}-surface 7s ease-in-out infinite`, transformOrigin: "16px 17px" }}>
        <ellipse cx="16" cy="17" rx="11" ry="2" fill="white" opacity="0.2"/>
        <ellipse cx="14" cy="16.5" rx="4.5" ry="0.9" fill="white" opacity="0.35"/>
      </g>
      {/* Bubbles */}
      <g style={{ animation: `${id}-bubble1 6s ease-in-out infinite` }}>
        <circle cx="12" cy="14" r="0.9" fill="white" opacity="0"/>
      </g>
      <g style={{ animation: `${id}-bubble2 8s ease-in-out infinite`, animationDelay: "-3s" }}>
        <circle cx="19" cy="16" r="0.65" fill="white" opacity="0"/>
      </g>
    </>
  );
}

/* ─── Single glass coin ──────────────────────────────────────── */
type CoinVariant = "A" | "B" | "C";

function GlassCoin({ sym, coinColor, hi, lo, glow, liq, variant }: typeof TOKENS[0] & { variant: CoinVariant }) {
  const id = `c-${variant.toLowerCase()}-${sym.toLowerCase()}`;
  const S = 200;
  const isSOL = sym === "SOL";

  /* Spin speed + tint per variant */
  const spinDur = variant === "A" ? 7 : variant === "B" ? 9 : 6;
  const bobDur  = variant === "A" ? 4 : variant === "B" ? 5 : 3.5;
  /* Glass opacity: A=cool-clear, B=neutral, C=dark */
  const bodyOp  = variant === "A" ? 0.52 : variant === "B" ? 0.45 : 0.60;
  /* Variant tint overlay */
  const tintColor = variant === "A" ? "rgba(140,200,255,0.15)"
                  : variant === "B" ? "rgba(255,255,255,0.08)"
                  : "rgba(20,10,40,0.25)";

  const logoPath = getLogoPath(sym);

  return (
    <div style={{
      width: S, height: S,
      filter: `drop-shadow(0 18px 35px ${glow}88) drop-shadow(0 0 70px ${glow}44)`,
    }}>
      <style>{`
        @keyframes ${id}-bob  { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-18px)} }
        @keyframes ${id}-spin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
      `}</style>

      {/* Bob wrapper */}
      <div style={{ animation: `${id}-bob ${bobDur}s ease-in-out infinite` }}>
        {/* Spin wrapper */}
        <div style={{
          width: S, height: S,
          animation: `${id}-spin ${spinDur}s linear infinite`,
          perspective: "700px",
          transformStyle: "preserve-3d",
        }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              {/* ── Gradients ── */}
              <radialGradient id={`${id}-rim-g`} cx="35%" cy="30%" r="65%">
                <stop offset="0%"  stopColor={hi}     stopOpacity="0.9"/>
                <stop offset="50%" stopColor={coinColor} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={lo}    stopOpacity="0.85"/>
              </radialGradient>

              <radialGradient id={`${id}-face-g`} cx="38%" cy="30%" r="70%">
                <stop offset="0%"  stopColor={hi}     stopOpacity={bodyOp + 0.15}/>
                <stop offset="45%" stopColor={coinColor} stopOpacity={bodyOp}/>
                <stop offset="100%" stopColor={lo}    stopOpacity={bodyOp + 0.1}/>
              </radialGradient>

              {/* Caustic light */}
              <radialGradient id={`${id}-cau1`} cx="30%" cy="25%" r="45%">
                <stop offset="0%"  stopColor="white"  stopOpacity="0.65"/>
                <stop offset="40%" stopColor={hi}     stopOpacity="0.25"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={`${id}-cau2`} cx="68%" cy="72%" r="35%">
                <stop offset="0%"  stopColor={hi}  stopOpacity="0.4"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>

              {/* Rim edge gradient */}
              <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0.5" y2="1">
                <stop offset="0%"  stopColor="white"  stopOpacity="0.9"/>
                <stop offset="55%" stopColor={hi}     stopOpacity="0.4"/>
                <stop offset="100%" stopColor={lo}   stopOpacity="0.1"/>
              </linearGradient>

              {/* Logo fill */}
              <radialGradient id={`${id}-logo-g`} cx="35%" cy="28%" r="60%">
                <stop offset="0%"  stopColor="white"   stopOpacity="0.95"/>
                <stop offset="60%" stopColor="white"   stopOpacity="0.75"/>
                <stop offset="100%" stopColor={hi}    stopOpacity="0.5"/>
              </radialGradient>

              {/* Filters */}
              <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="0.4"/></filter>
              <filter id={`${id}-glow`}><feGaussianBlur stdDeviation="1.6"/></filter>

              {/* Clip: coin face circle */}
              <clipPath id={`${id}-face-clip`}>
                <circle cx="16" cy="16" r="13.2"/>
              </clipPath>

              {/* SOL per-bar clip paths */}
              {isSOL && SOL_BAR_DEFS.map((b, i) => (
                <clipPath key={i} id={`${id}-sol-${i}`}><path d={b.path}/></clipPath>
              ))}
              {isSOL && SOL_BAR_DEFS.map((b, i) => (
                <linearGradient key={i} id={`${id}-sol-g-${i}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"  stopColor={b.from} stopOpacity="1"/>
                  <stop offset="100%" stopColor={b.to}  stopOpacity="0.9"/>
                </linearGradient>
              ))}
            </defs>

            {/* ── 1. Outer glow bloom ── */}
            <g filter={`url(#${id}-glow)`} opacity="0.55">
              <path d={COIN_RIM} fill={coinColor}/>
            </g>

            {/* ── 2. Scalloped rim ── */}
            <path d={COIN_RIM} fill={`url(#${id}-rim-g)`} opacity="0.82"/>
            {/* Rim specular top-left */}
            <path d={COIN_RIM} fill="none"
              stroke="white" strokeWidth="0.3" opacity="0.45"
              strokeDasharray="1.5,0.8"
            />

            {/* ── 3. Coin face base ── */}
            <circle cx="16" cy="16" r="13.2" fill={`url(#${id}-face-g)`}/>

            {/* ── 4. Liquid inside ── */}
            <g clipPath={`url(#${id}-face-clip)`}>
              <CoinLiquid id={`${id}-liq`} color={liq}/>
            </g>

            {/* ── 5. Logo (exact, unchanged) ── */}
            <g clipPath={`url(#${id}-face-clip)`}>
              {isSOL ? (
                /* SOL: each bar has its own gradient color */
                <g transform="translate(16,16) scale(0.82) translate(-16,-16)">
                  {SOL_BAR_DEFS.map((b, i) => (
                    <g key={i}>
                      <path d={b.path} fill={`url(#${id}-sol-g-${i})`} opacity="0.92"/>
                      {/* Glass sheen on bar */}
                      <path d={b.path} fill="none" stroke="white" strokeWidth="0.22" opacity="0.5"/>
                      <clipPath id={`${id}-sol-cl-${i}`}><path d={b.path}/></clipPath>
                      <g clipPath={`url(#${id}-sol-cl-${i})`}>
                        <ellipse
                          cx={String(8 + i * 1)} cy={String(6.2 + i * 3.5)}
                          rx="8" ry="1.5"
                          fill="white" opacity="0.3"
                          transform="rotate(-10)"
                          filter={`url(#${id}-blur)`}
                        />
                      </g>
                    </g>
                  ))}
                </g>
              ) : (
                <g transform="translate(16,16) scale(0.82) translate(-16,-16)">
                  {/* Logo shadow/depth */}
                  <path d={logoPath} fill={lo} opacity="0.4" transform="translate(0.3,0.4)"
                    filter={`url(#${id}-blur)`}/>
                  {/* Logo main fill */}
                  <path d={logoPath} fill={`url(#${id}-logo-g)`} opacity="0.9"/>
                  {/* Logo inner glow */}
                  <path d={logoPath} fill={hi} opacity="0.2" filter={`url(#${id}-blur)`}/>
                </g>
              )}
            </g>

            {/* ── 6. Glass highlight (large diffuse) ── */}
            <g clipPath={`url(#${id}-face-clip)`}>
              <ellipse cx="10.5" cy="8" rx="7" ry="5"
                fill="white" opacity="0.18"
                transform="rotate(-25,10.5,8)"
                filter={`url(#${id}-blur)`}/>
            </g>

            {/* ── 7. Caustic spots ── */}
            <circle cx="16" cy="16" r="13.2" fill={`url(#${id}-cau1)`}/>
            <circle cx="16" cy="16" r="13.2" fill={`url(#${id}-cau2)`}/>

            {/* ── 8. Variant tint overlay ── */}
            <circle cx="16" cy="16" r="13.2" fill={tintColor}/>

            {/* ── 9. Sharp highlight blob (top-left) ── */}
            <g clipPath={`url(#${id}-face-clip)`}>
              <ellipse cx="9.5" cy="7" rx="4.5" ry="2.8"
                fill="white" opacity="0.5"
                transform="rotate(-28,9.5,7)"/>
              <ellipse cx="8.5" cy="6.3" rx="2" ry="1.1"
                fill="white" opacity="0.8"
                transform="rotate(-28,8.5,6.3)"/>
            </g>

            {/* ── 10. Prismatic refraction lines ── */}
            <g clipPath={`url(#${id}-face-clip)`} opacity="0.3">
              <line x1="3" y1="13" x2="29" y2="11.5" stroke="white" strokeWidth="0.4" opacity="0.5"/>
              <line x1="3" y1="17" x2="29" y2="15.5" stroke={hi}    strokeWidth="0.22" opacity="0.3"/>
            </g>

            {/* ── 11. Chromatic rim ── */}
            <circle cx="16" cy="16" r="13.2"
              fill="none" stroke="rgba(255,80,80,0.2)"
              strokeWidth="0.8" transform="translate(-0.2,0)"/>
            <circle cx="16" cy="16" r="13.2"
              fill="none" stroke="rgba(80,80,255,0.15)"
              strokeWidth="0.8" transform="translate(0.2,0)"/>

            {/* ── 12. Face rim light ── */}
            <circle cx="16" cy="16" r="13.2"
              fill="none" stroke={`url(#${id}-edge)`} strokeWidth="0.5"/>
            <circle cx="16" cy="16" r="13.2"
              fill="none" stroke="white" strokeWidth="0.2" opacity="0.6"/>

            {/* ── 13. Inner circle bevel line (embossed look) ── */}
            <circle cx="16" cy="16" r="11.8"
              fill="none" stroke="white" strokeWidth="0.18" opacity="0.3"/>

            {/* ── 14. Ground shadow ── */}
            <ellipse cx="16" cy="31.8" rx="9" ry="1.2"
              fill={glow} opacity="0.25" filter={`url(#${id}-blur)`}/>

            {/* ── 15. Coin edge (3D side visible when not face-on) ── */}
            <ellipse cx="16" cy="16" rx="15.8" ry="15.8"
              fill="none" stroke={coinColor} strokeWidth="0.15" opacity="0.3"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── Row label ─────────────────────────────────────────────── */
function RowLabel({ letter, title, color, desc }: { letter: string; title: string; color: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${color}55,transparent)` }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}55`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color }}>
          {letter}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>— {desc}</span>
      </div>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(270deg,${color}55,transparent)` }}/>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function GlassTokens() {
  return (
    <div style={{ minHeight: "100vh", background: "#060910", color: "#fff",
      fontFamily: "system-ui,-apple-system,sans-serif", padding: "36px 20px 60px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8,
            background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Spinning 3D Glass Coins
          </h1>
          <p style={{ color: "rgba(255,255,255,.28)", fontSize: 13 }}>
            Точный логотип · Монета из стекла · Вращается вокруг оси · Парит
          </p>
        </div>

        {/* ── A: холодное прозрачное стекло ── */}
        <div style={{ marginBottom: 70 }}>
          <RowLabel letter="A" title="Cold Crystal Glass" color="#00e5ff"
            desc="холодный синий отлив, максимум прозрачности"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassCoin key={t.sym} {...t} variant="A"/>)}
          </div>
        </div>

        {/* ── B: нейтральное чистое стекло ── */}
        <div style={{ marginBottom: 70 }}>
          <RowLabel letter="B" title="Clear Glass" color="#aaaaff"
            desc="нейтральное, чистое, сильная каустика"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassCoin key={t.sym} {...t} variant="B"/>)}
          </div>
        </div>

        {/* ── C: тёмное стекло / обсидиан ── */}
        <div style={{ marginBottom: 48 }}>
          <RowLabel letter="C" title="Dark Obsidian Glass" color="#a855f7"
            desc="тёмное стекло, глубина, контрастные блики"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassCoin key={t.sym} {...t} variant="C"/>)}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "18px 24px", borderRadius: 14,
          background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
          color: "rgba(255,255,255,.3)", fontSize: 13 }}>
          Скажи <b style={{ color: "#00e5ff" }}>A</b>, <b style={{ color: "#aaaaff" }}>B</b> или <b style={{ color: "#a855f7" }}>C</b> — применю на биржу + деплой
        </div>
      </div>
    </div>
  );
}
