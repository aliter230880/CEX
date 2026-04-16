/**
 * ATEX — Pure 3D volumetric token logos
 * No cards. Just the symbols rendered as glass / crystal / liquid 3D objects.
 */

/* ─── Token colours ────────────────────────────────────────────── */
const TOKENS = [
  { sym: "BTC", hi: "#FFE0A0", mid: "#F7931A", lo: "#7a3a00", glow: "#F7931A" },
  { sym: "ETH", hi: "#c4d8ff", mid: "#627EEA", lo: "#1a2e88", glow: "#627EEA" },
  { sym: "BNB", hi: "#FFF0A0", mid: "#F0B90B", lo: "#7a5500", glow: "#F0B90B" },
  { sym: "SOL", hi: "#e0c4ff", mid: "#9945FF", lo: "#3c0e9e", glow: "#9945FF" },
  { sym: "POL", hi: "#d4bfff", mid: "#8247E5", lo: "#2e0e80", glow: "#8247E5" },
];

/* ─── SVG paths (32×32 viewBox) ────────────────────────────────── */
const BTC_PATH = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";
const ETH_TOP  = "M16 4 L8 16 L16 20 L24 16 Z";
const ETH_BOT  = "M8 17.5 L16 21.5 L24 17.5 L16 29 Z";
const ETH_LF   = "M16 4 L8 16 L16 12 Z";
const ETH_RF   = "M16 4 L24 16 L16 12 Z";
const ETH_LB   = "M8 17.5 L16 21.5 L16 13 Z";
const ETH_RB   = "M24 17.5 L16 21.5 L16 13 Z";
const BNB_PATH = "M16 9l2.5 2.5L16 14l-2.5-2.5L16 9zM9 16l2.5-2.5 2.5 2.5-2.5 2.5L9 16zM23 16l-2.5 2.5-2.5-2.5 2.5-2.5L23 16zM16 18.5l2.5 2.5L16 23.5l-2.5-2.5L16 18.5z M13.5 13.5l2.5 2.5 2.5-2.5-2.5-2.5z M13.5 18.5l2.5-2.5 2.5 2.5-2.5 2.5z";
const SOL_PATH = "M8 20.5h13.5l-2.5 2.5H8l2.5-2.5zM8 14.8h13.5l2.5-2.5H10.5L8 14.8zM21.5 9H8l2.5 2.5H24L21.5 9z";
const POL_PATH = "M20 12l-4-2.3-4 2.3v4.6l4 2.3 4-2.3V12zm-4-4l7 4v8l-7 4-7-4v-8l7-4z";

const PATHS: Record<string, string> = {
  BTC: BTC_PATH, BNB: BNB_PATH, SOL: SOL_PATH, POL: POL_PATH,
};

/* ════════════════════════════════════════════════════════════════
   VARIANT A — CRYSTAL GEM
   ETH is decomposed into real 3D facets.
   Other tokens rendered as crystalline extruded shapes.
   ════════════════════════════════════════════════════════════════ */

function CrystalETH({ hi, mid, lo, glow }: typeof TOKENS[0]) {
  const id = "cry-eth";
  const S = 200; // SVG size
  return (
    <div style={{ width: S, height: S, filter: `drop-shadow(0 24px 40px ${glow}66) drop-shadow(0 0 80px ${glow}33)` }}>
      <style>{`
        @keyframes ${id}-rock {
          0%,100%{transform:rotateY(-15deg) rotateX(10deg)}
          33%    {transform:rotateY(14deg)  rotateX( 6deg)}
          66%    {transform:rotateY(-6deg)  rotateX(14deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>
      <div style={{ animation: `${id}-bob 5s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{ animation: `${id}-rock 9s ease-in-out infinite`, transformStyle: "preserve-3d", perspective: 600, width: S, height: S }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              <linearGradient id={`${id}-g1`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={hi} stopOpacity="0.95"/>
                <stop offset="100%" stopColor={mid} stopOpacity="0.7"/>
              </linearGradient>
              <linearGradient id={`${id}-g2`} x1="1" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mid} stopOpacity="0.75"/>
                <stop offset="100%" stopColor={lo} stopOpacity="0.5"/>
              </linearGradient>
              <linearGradient id={`${id}-g3`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lo} stopOpacity="0.6"/>
                <stop offset="100%" stopColor={mid} stopOpacity="0.4"/>
              </linearGradient>
              <linearGradient id={`${id}-g4`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={mid} stopOpacity="0.45"/>
                <stop offset="100%" stopColor={lo} stopOpacity="0.3"/>
              </linearGradient>
              <radialGradient id={`${id}-caustic`} cx="38%" cy="30%" r="40%">
                <stop offset="0%" stopColor="white" stopOpacity="0.45"/>
                <stop offset="60%" stopColor={hi} stopOpacity="0.15"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <filter id={`${id}-goo`}><feGaussianBlur stdDeviation="0.4"/></filter>
            </defs>

            {/* Faint depth copy behind (extrusion shadow) */}
            <g transform="translate(0.7, 1.4)" opacity="0.25" filter={`url(#${id}-goo)`}>
              <path d={ETH_TOP} fill={lo}/>
              <path d={ETH_BOT} fill={lo}/>
            </g>

            {/* Upper gem — 4 facets */}
            <path d={ETH_LF}  fill={`url(#${id}-g1)`}/>   {/* left-front  (brightest) */}
            <path d={ETH_RF}  fill={`url(#${id}-g2)`}/>   {/* right-front */}
            <path d={ETH_TOP} fill={`url(#${id}-g3)`} opacity="0.7"/>

            {/* Lower gem — 2 facets */}
            <path d={ETH_LB}  fill={`url(#${id}-g3)`} opacity="0.85"/>
            <path d={ETH_RB}  fill={`url(#${id}-g4)`} opacity="0.9"/>
            <path d={ETH_BOT} fill={`url(#${id}-g2)`} opacity="0.55"/>

            {/* Caustic light inside */}
            <path d={ETH_TOP} fill={`url(#${id}-caustic)`}/>
            <path d={ETH_LF}  fill={`url(#${id}-caustic)`} opacity="0.6"/>

            {/* Bright specular edge on left face */}
            <line x1="16" y1="4" x2="8" y2="16"  stroke="white" strokeWidth="0.25" opacity="0.7"/>
            <line x1="16" y1="4" x2="16" y2="12" stroke="white" strokeWidth="0.18" opacity="0.45"/>

            {/* Waist glint */}
            <line x1="8" y1="16" x2="24" y2="16" stroke={hi} strokeWidth="0.2" opacity="0.6"/>

            {/* Refraction: chromatic fringe on right edge */}
            <line x1="16" y1="4" x2="24" y2="16" stroke={mid} strokeWidth="0.5" opacity="0.25"/>

            {/* Ground reflection (blurred inverted) */}
            <g transform="translate(0, 33) scale(1, -0.25)" opacity="0.2">
              <path d={ETH_TOP} fill={mid}/>
              <path d={ETH_BOT} fill={mid}/>
            </g>
            <ellipse cx="16" cy="31" rx="6" ry="1.2" fill={glow} opacity="0.25"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function CrystalToken({ sym, hi, mid, lo, glow }: typeof TOKENS[0]) {
  const id = `cry-${sym.toLowerCase()}`;
  const path = PATHS[sym] || BTC_PATH;
  const S = 200;
  return (
    <div style={{ width: S, height: S, filter: `drop-shadow(0 20px 36px ${glow}66) drop-shadow(0 0 70px ${glow}2a)` }}>
      <style>{`
        @keyframes ${id}-rock {
          0%,100%{transform:rotateY(-14deg) rotateX(9deg)}
          33%    {transform:rotateY(13deg)  rotateX(5deg)}
          66%    {transform:rotateY(-7deg)  rotateX(13deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>
      <div style={{ animation: `${id}-bob 5.5s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{ animation: `${id}-rock 10s ease-in-out infinite`, transformStyle: "preserve-3d", perspective: 600, width: S, height: S }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              <linearGradient id={`${id}-main`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={hi} stopOpacity="0.9"/>
                <stop offset="55%" stopColor={mid} stopOpacity="0.75"/>
                <stop offset="100%" stopColor={lo} stopOpacity="0.55"/>
              </linearGradient>
              <radialGradient id={`${id}-spec`} cx="33%" cy="28%" r="45%">
                <stop offset="0%" stopColor="white" stopOpacity="0.7"/>
                <stop offset="50%" stopColor={hi} stopOpacity="0.3"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <filter id={`${id}-fr`}><feGaussianBlur stdDeviation="0.6"/></filter>
              <filter id={`${id}-glo`}><feGaussianBlur stdDeviation="1.2"/></filter>
            </defs>

            {/* Glow layer */}
            <g filter={`url(#${id}-glo)`} opacity="0.55">
              <path d={path} fill={mid} transform="translate(0.3,0.5)"/>
            </g>

            {/* Extrusion depth (3 layers offset) */}
            {[3, 2, 1].map(d => (
              <path key={d} d={path} fill={lo}
                opacity={0.25 - d * 0.04}
                transform={`translate(${d * 0.7}, ${d * 0.9})`}
                filter={d === 3 ? `url(#${id}-fr)` : undefined}
              />
            ))}

            {/* Main face */}
            <path d={path} fill={`url(#${id}-main)`}/>

            {/* Specular highlight */}
            <path d={path} fill={`url(#${id}-spec)`}/>

            {/* Thin rim light */}
            <path d={path} fill="none" stroke={hi} strokeWidth="0.22" opacity="0.65"/>
            <path d={path} fill="none" stroke="white" strokeWidth="0.1" opacity="0.4"/>

            {/* Ground shadow */}
            <ellipse cx="16" cy="31" rx="7" ry="1.2" fill={glow} opacity="0.2"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VARIANT B — GLASS MATERIAL (like the BTC blue glass reference)
   Thick transparent glass with refraction, rim glow, caustic.
   ════════════════════════════════════════════════════════════════ */

function GlassToken({ sym, hi, mid, lo, glow }: typeof TOKENS[0]) {
  const id = `gls-${sym.toLowerCase()}`;
  const path = sym === "ETH" ? `${ETH_TOP} ${ETH_BOT}` : (PATHS[sym] || BTC_PATH);
  const S = 200;
  return (
    <div style={{ width: S, height: S, filter: `drop-shadow(0 22px 44px ${glow}77) drop-shadow(0 0 80px ${glow}33)` }}>
      <style>{`
        @keyframes ${id}-rock {
          0%,100%{transform:rotateY(-16deg) rotateX(8deg)}
          33%    {transform:rotateY(12deg)  rotateX(3deg)}
          66%    {transform:rotateY(-8deg)  rotateX(13deg)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>
      <div style={{ animation: `${id}-bob 5s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{ animation: `${id}-rock 8.5s ease-in-out infinite`, transformStyle: "preserve-3d", perspective: 600, width: S, height: S }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              {/* Glass body gradient — cool tinted like cyan glass */}
              <linearGradient id={`${id}-body`} x1="0.2" y1="0" x2="0.8" y2="1">
                <stop offset="0%"   stopColor={hi}  stopOpacity="0.55"/>
                <stop offset="40%"  stopColor={mid}  stopOpacity="0.65"/>
                <stop offset="75%"  stopColor={mid}  stopOpacity="0.45"/>
                <stop offset="100%" stopColor={lo}   stopOpacity="0.7"/>
              </linearGradient>
              {/* Inner light scatter (caustic) */}
              <radialGradient id={`${id}-cau`} cx="30%" cy="25%" r="50%">
                <stop offset="0%"   stopColor="white" stopOpacity="0.6"/>
                <stop offset="40%"  stopColor={hi}    stopOpacity="0.3"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              {/* Second caustic spot */}
              <radialGradient id={`${id}-cau2`} cx="68%" cy="70%" r="35%">
                <stop offset="0%"   stopColor={hi}   stopOpacity="0.35"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              {/* Edge rim */}
              <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="white" stopOpacity="0.9"/>
                <stop offset="50%"  stopColor={hi}    stopOpacity="0.4"/>
                <stop offset="100%" stopColor={mid}   stopOpacity="0.15"/>
              </linearGradient>
              <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="0.8"/></filter>
              <filter id={`${id}-gbody`}><feGaussianBlur stdDeviation="1.5"/></filter>
            </defs>

            {/* Back glow bloom */}
            <g filter={`url(#${id}-gbody)`} opacity="0.7">
              <path d={path} fill={mid}/>
            </g>

            {/* Deep interior volume (darkest, back) */}
            <path d={path} fill={lo} opacity="0.5" transform="translate(0.4, 0.6)"/>

            {/* Glass body */}
            <path d={path} fill={`url(#${id}-body)`}/>

            {/* Caustic light 1 */}
            <path d={path} fill={`url(#${id}-cau)`}/>
            {/* Caustic light 2 */}
            <path d={path} fill={`url(#${id}-cau2)`}/>

            {/* Internal refraction lines (horizontal prismatic bands) */}
            <clipPath id={`${id}-clip`}><path d={path}/></clipPath>
            <g clipPath={`url(#${id}-clip)`} opacity="0.3">
              <line x1="-2" y1="13" x2="34" y2="11" stroke="white" strokeWidth="0.5" opacity="0.6"/>
              <line x1="-2" y1="15" x2="34" y2="13.5" stroke={hi} strokeWidth="0.3" opacity="0.4"/>
              <line x1="-2" y1="19" x2="34" y2="17.5" stroke={mid} strokeWidth="0.3" opacity="0.3"/>
            </g>

            {/* Rim / edge light (bright outline) */}
            <path d={path} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="0.4"/>
            <path d={path} fill="none" stroke="white" strokeWidth="0.15" opacity="0.55"/>

            {/* Top-left highlight blob */}
            <g clipPath={`url(#${id}-clip)`}>
              <ellipse cx="12" cy="10" rx="4.5" ry="3.5" fill="white" opacity="0.18" transform="rotate(-20,12,10)"/>
            </g>

            {/* Reflection puddle */}
            <g transform="translate(0, 33.5) scale(1,-0.2)" opacity="0.15" filter={`url(#${id}-blur)`}>
              <path d={path} fill={mid}/>
            </g>
            <ellipse cx="16" cy="31.5" rx="6.5" ry="1" fill={glow} opacity="0.22"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VARIANT C — LIQUID METAL / CHROME
   Symbol as molten metal — iridescent chrome, liquid surface.
   ════════════════════════════════════════════════════════════════ */

function LiquidToken({ sym, hi, mid, lo, glow }: typeof TOKENS[0]) {
  const id = `liq-${sym.toLowerCase()}`;
  const path = sym === "ETH" ? `${ETH_TOP} ${ETH_BOT}` : (PATHS[sym] || BTC_PATH);
  const S = 200;
  return (
    <div style={{ width: S, height: S, filter: `drop-shadow(0 20px 40px ${glow}88) drop-shadow(0 0 60px ${glow}44)` }}>
      <style>{`
        @keyframes ${id}-rock {
          0%,100%{transform:rotateY(-10deg) rotateX(6deg) scale(1)   }
          25%    {transform:rotateY( 14deg) rotateX(3deg) scale(1.02)}
          50%    {transform:rotateY(-4deg)  rotateX(10deg) scale(0.98)}
          75%    {transform:rotateY(9deg)   rotateX(4deg) scale(1.01)}
        }
        @keyframes ${id}-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes ${id}-shift { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      `}</style>
      <div style={{ animation: `${id}-bob 5.2s ease-in-out infinite`, transformStyle: "preserve-3d" }}>
        <div style={{ animation: `${id}-rock 8s ease-in-out infinite`, transformStyle: "preserve-3d", perspective: 600, width: S, height: S }}>
          <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
            <defs>
              {/* Chrome / liquid metal: multi-stop with cool + warm bands */}
              <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="white"  stopOpacity="0.95"/>
                <stop offset="18%"  stopColor={hi}     stopOpacity="0.9"/>
                <stop offset="35%"  stopColor={mid}    stopOpacity="0.85"/>
                <stop offset="50%"  stopColor={lo}     stopOpacity="0.95"/>
                <stop offset="65%"  stopColor={mid}    stopOpacity="0.75"/>
                <stop offset="80%"  stopColor={hi}     stopOpacity="0.8"/>
                <stop offset="100%" stopColor="white"  stopOpacity="0.6"/>
              </linearGradient>
              <radialGradient id={`${id}-spec1`} cx="28%" cy="22%" r="30%">
                <stop offset="0%" stopColor="white" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              <radialGradient id={`${id}-spec2`} cx="70%" cy="75%" r="22%">
                <stop offset="0%" stopColor={hi} stopOpacity="0.7"/>
                <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
              </radialGradient>
              {/* Iridescent overlay — rotates through hues */}
              <linearGradient id={`${id}-iris`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={hi}  stopOpacity="0.3"/>
                <stop offset="30%"  stopColor="white" stopOpacity="0.15"/>
                <stop offset="55%"  stopColor={mid}  stopOpacity="0.25"/>
                <stop offset="80%"  stopColor={lo}   stopOpacity="0.3"/>
                <stop offset="100%" stopColor={hi}  stopOpacity="0.2"/>
              </linearGradient>
              <filter id={`${id}-glo`}><feGaussianBlur stdDeviation="2"/></filter>
              <filter id={`${id}-sharp`}><feGaussianBlur stdDeviation="0.15"/></filter>
            </defs>

            {/* Outer bloom glow */}
            <g filter={`url(#${id}-glo)`} opacity="0.8">
              <path d={path} fill={mid} transform="scale(1.08) translate(-1,-1)"/>
            </g>

            {/* Base metal body */}
            <path d={path} fill={`url(#${id}-chrome)`} filter={`url(#${id}-sharp)`}/>

            {/* Iridescent sheen */}
            <path d={path} fill={`url(#${id}-iris)`} opacity="0.65"/>

            {/* Primary specular hotspot */}
            <path d={path} fill={`url(#${id}-spec1)`}/>
            {/* Secondary specular */}
            <path d={path} fill={`url(#${id}-spec2)`}/>

            {/* Liquid surface micro-detail: thin horizontal sheen lines */}
            <clipPath id={`${id}-cl`}><path d={path}/></clipPath>
            <g clipPath={`url(#${id}-cl)`}>
              {[9, 13.5, 18, 22].map((y, i) => (
                <line key={i} x1="-2" y1={y} x2="34" y2={y - 0.8 + i * 0.2}
                  stroke="white" strokeWidth="0.18" opacity={0.12 + i * 0.04}/>
              ))}
            </g>

            {/* Hard rim */}
            <path d={path} fill="none" stroke="white" strokeWidth="0.3" opacity="0.7"/>
            <path d={path} fill="none" stroke={hi} strokeWidth="0.18" opacity="0.5"/>

            {/* Ground reflection */}
            <g transform="translate(0,33.5) scale(1,-0.18)" opacity="0.18" filter={`url(#${id}-glo)`}>
              <path d={path} fill={mid}/>
            </g>
            <ellipse cx="16" cy="31.5" rx="7" ry="1" fill={glow} opacity="0.28"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── Row label ─────────────────────────────────────────────────── */
function RowLabel({ letter, title, color, desc }: { letter: string; title: string; color: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg,${color}55,transparent)` }}/>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: `${color}22`, border: `1px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color }}>
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
    <div style={{ minHeight: "100vh", background: "#060910", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "36px 20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            3D Token Logos — без плашек
          </h1>
          <p style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>Чистый объём · Только символ · Скажи A, B или C</p>
        </div>

        {/* ── A: Crystal ── */}
        <div style={{ marginBottom: 60 }}>
          <RowLabel letter="A" title="Crystal Prism" color="#00e5ff" desc="огранённые грани, преломление, как ETH-кристалл"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            <CrystalETH {...TOKENS[1]} />
            {TOKENS.filter(t => t.sym !== "ETH").map(t => (
              <CrystalToken key={t.sym} {...t}/>
            ))}
          </div>
        </div>

        {/* ── B: Glass ── */}
        <div style={{ marginBottom: 60 }}>
          <RowLabel letter="B" title="Glass Material" color="#627EEA" desc="стеклянная масса, каустика, хроматические кромки, как BTC-референс"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <GlassToken key={t.sym} {...t}/>)}
          </div>
        </div>

        {/* ── C: Liquid Metal ── */}
        <div style={{ marginBottom: 40 }}>
          <RowLabel letter="C" title="Liquid Metal" color="#a855f7" desc="жидкий хром, иридесцентный блеск, зеркальная поверхность"/>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
            {TOKENS.map(t => <LiquidToken key={t.sym} {...t}/>)}
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "18px 24px", borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", color: "rgba(255,255,255,.3)", fontSize: 13 }}>
          Скажи <b style={{ color: "#00e5ff" }}>A</b>, <b style={{ color: "#627EEA" }}>B</b> или <b style={{ color: "#a855f7" }}>C</b> — и сразу применю на биржу и задеплою
        </div>
      </div>
    </div>
  );
}
