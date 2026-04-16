/**
 * ATEX — 3D Glass Token Logos v5
 * 5 reference-accurate shapes, each unique 3D glass form.
 * BTC: extruded cyan-glass ₿  |  ETH: faceted crystal octahedron
 * BNB: gold glass 5-element   |  SOL: gradient parallelogram bars
 * POL: purple glass dual rings
 */

/* ─── Shared animation wrapper ──────────────────────────────── */
function Floater({
  id, spinDur, bobDur, bobAmt = 16, tiltDeg = 8,
  glow, size = 220, children,
}: {
  id: string; spinDur: number; bobDur: number;
  bobAmt?: number; tiltDeg?: number;
  glow: string; size?: number; children: React.ReactNode;
}) {
  return (
    <div style={{ width: size, height: size, filter: `drop-shadow(0 24px 48px ${glow}99) drop-shadow(0 0 100px ${glow}44)` }}>
      <style>{`
        @keyframes ${id}-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-${bobAmt}px)} }
        @keyframes ${id}-spin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
        @keyframes ${id}-tilt {
          0%,100%{transform:rotateX(${tiltDeg}deg) rotateZ(-2deg)}
          50%    {transform:rotateX(-${tiltDeg * 0.6}deg) rotateZ(2deg)}
        }
      `}</style>
      <div style={{ animation: `${id}-bob ${bobDur}s ease-in-out infinite` }}>
        <div style={{
          animation: `${id}-spin ${spinDur}s linear infinite`,
          perspective: "800px", transformStyle: "preserve-3d",
          width: size, height: size,
        }}>
          <div style={{
            animation: `${id}-tilt ${bobDur * 1.4}s ease-in-out infinite`,
            transformStyle: "preserve-3d", width: size, height: size,
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Liquid inside shape ────────────────────────────────────── */
function Liq({ id, color, hi }: { id: string; color: string; hi: string }) {
  return (
    <>
      <style>{`
        @keyframes ${id}-l { 0%,100%{transform:translateX(0) translateY(0)} 33%{transform:translateX(5px) translateY(-4px)} 66%{transform:translateX(-4px) translateY(-7px)} }
        @keyframes ${id}-s { 0%,100%{transform:scaleX(1) translateX(0)} 40%{transform:scaleX(.86) translateX(4px)} 70%{transform:scaleX(1.1) translateX(-3px)} }
        @keyframes ${id}-b { 0%,100%{opacity:0;transform:translateY(0)} 50%{opacity:.5;transform:translateY(-5px)} }
      `}</style>
      <g style={{ animation: `${id}-l 9s ease-in-out infinite` }}>
        <ellipse cx="16" cy="24" rx="16" ry="12" fill={color} opacity="0.5"/>
      </g>
      <g style={{ animation: `${id}-s 7s ease-in-out infinite`, transformOrigin: "16px 18px" }}>
        <ellipse cx="16" cy="18" rx="12" ry="2.2" fill="white" opacity="0.22"/>
        <ellipse cx="14" cy="17.4" rx="4.5" ry="0.9" fill="white" opacity="0.38"/>
      </g>
      <g style={{ animation: `${id}-b 6s ease-in-out infinite` }}><circle cx="12" cy="14" r="0.9" fill="white" opacity="0"/></g>
      <g style={{ animation: `${id}-b 8s ease-in-out infinite`, animationDelay: "-3s" }}><circle cx="19" cy="16" r="0.65" fill="white" opacity="0"/></g>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ETH — Faceted crystal octahedron
   Reference: bright cyan-blue crystal with visible separate faces
   ═══════════════════════════════════════════════════════════════ */
function ETHCrystal() {
  const id = "eth";
  const S = 220;
  // Faces of upper pyramid (split at center point (16,11))
  const FA = "M16,4 L8,16 L16,11 Z";          // top-left  — BRIGHTEST (lit)
  const FB = "M16,4 L24,16 L16,11 Z";          // top-right — medium
  const FC = "M8,16 L16,20 L16,11 Z";          // bot-left  — medium-dark
  const FD = "M24,16 L16,20 L16,11 Z";         // bot-right — darkest upper
  // Lower inverted pyramid (M8,17.5 L16,21.5 L24,17.5 L16,29 Z), split at (16,23)
  const FE = "M8,17.5 L16,21.5 L24,17.5 Z";   // upper V of lower — medium
  const FF = "M8,17.5 L16,29 L16,23 Z";        // lower-left — dark
  const FG = "M24,17.5 L16,29 L16,23 Z";       // lower-right — darkest

  // Full clip
  const FULL = `M16,4 L8,16 L16,20 L24,16 Z M8,17.5 L16,21.5 L24,17.5 L16,29 Z`;

  return (
    <Floater id={id} spinDur={14} bobDur={5} tiltDeg={10} glow="#00BFFF" size={S}>
      <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
        <defs>
          {/* Face A — bright cyan-white */}
          <linearGradient id="e-ga" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0FAFF" stopOpacity="0.98"/>
            <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#00AADD" stopOpacity="0.8"/>
          </linearGradient>
          {/* Face B */}
          <linearGradient id="e-gb" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D4EE" stopOpacity="0.85"/>
            <stop offset="100%" stopColor="#0077BB" stopOpacity="0.7"/>
          </linearGradient>
          {/* Face C */}
          <linearGradient id="e-gc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0088CC" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#004488" stopOpacity="0.65"/>
          </linearGradient>
          {/* Face D */}
          <linearGradient id="e-gd" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#005599" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="#002266" stopOpacity="0.6"/>
          </linearGradient>
          {/* Face E — lower top V */}
          <linearGradient id="e-ge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0099CC" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#0055AA" stopOpacity="0.55"/>
          </linearGradient>
          {/* Face F — lower-left dark */}
          <linearGradient id="e-gf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#003388" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#001155" stopOpacity="0.55"/>
          </linearGradient>
          {/* Face G — darkest */}
          <linearGradient id="e-gg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#002266" stopOpacity="0.65"/>
            <stop offset="100%" stopColor="#000A22" stopOpacity="0.8"/>
          </linearGradient>
          {/* Caustic inside crystal */}
          <radialGradient id="e-cau" cx="30%" cy="35%" r="48%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55"/>
            <stop offset="35%" stopColor="#00E5FF" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="e-cau2" cx="65%" cy="70%" r="35%">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <filter id="e-bloom"><feGaussianBlur stdDeviation="2.2"/></filter>
          <filter id="e-soft"><feGaussianBlur stdDeviation="0.3"/></filter>
          <clipPath id="e-clip"><path d={FULL}/></clipPath>
        </defs>

        {/* Back bloom */}
        <g filter="url(#e-bloom)" opacity="0.7">
          <path d={FULL} fill="#00BFFF"/>
        </g>

        {/* Extrusion depth */}
        {[3,2,1].map(d => (
          <path key={d} d={FULL} fill="#001155" opacity={0.22 - d*0.05}
            transform={`translate(${d*.7},${d*.9})`}/>
        ))}

        {/* Liquid */}
        <g clipPath="url(#e-clip)">
          <Liq id="e-liq" color="#00BFFF99" hi="#00E5FF"/>
        </g>

        {/* Crystal faces — upper pyramid */}
        <path d={FA} fill="url(#e-ga)"/>   {/* top-left  BRIGHT */}
        <path d={FB} fill="url(#e-gb)"/>   {/* top-right medium */}
        <path d={FC} fill="url(#e-gc)"/>   {/* bot-left  medium-dark */}
        <path d={FD} fill="url(#e-gd)"/>   {/* bot-right darkest upper */}

        {/* Face edge lines (facet crease lines) */}
        <line x1="16" y1="4"  x2="16" y2="11" stroke="white" strokeWidth="0.18" opacity="0.6"/>
        <line x1="16" y1="11" x2="8"  y2="16" stroke="#00E5FF" strokeWidth="0.18" opacity="0.4"/>
        <line x1="16" y1="11" x2="24" y2="16" stroke="#003388" strokeWidth="0.18" opacity="0.4"/>

        {/* Equator crease */}
        <line x1="8" y1="16" x2="24" y2="16" stroke="#00BFFF" strokeWidth="0.28" opacity="0.55"/>

        {/* Crystal faces — lower pyramid */}
        <path d={FE} fill="url(#e-ge)"/>   {/* upper V */}
        <path d={FF} fill="url(#e-gf)"/>   {/* lower-left */}
        <path d={FG} fill="url(#e-gg)"/>   {/* lower-right darkest */}

        {/* Lower crease lines */}
        <line x1="8"  y1="17.5" x2="16" y2="23" stroke="#003388" strokeWidth="0.18" opacity="0.4"/>
        <line x1="24" y1="17.5" x2="16" y2="23" stroke="#002266" strokeWidth="0.18" opacity="0.35"/>

        {/* Caustic light inside */}
        <path d={FULL} fill="url(#e-cau)"/>
        <path d={FULL} fill="url(#e-cau2)"/>

        {/* Top-left bright specular blob */}
        <g clipPath="url(#e-clip)">
          <ellipse cx="10" cy="7" rx="4" ry="3" fill="white" opacity="0.45"
            transform="rotate(-30,10,7)" filter="url(#e-soft)"/>
          <ellipse cx="9"  cy="6.5" rx="1.8" ry="1.1" fill="white" opacity="0.75"
            transform="rotate(-30,9,6.5)"/>
        </g>

        {/* Chromatic rim */}
        <path d={FULL} fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="0.7" transform="translate(-0.3,0)"/>
        <path d={FULL} fill="none" stroke="rgba(80,80,255,0.12)" strokeWidth="0.7" transform="translate(0.3,0)"/>

        {/* Rim light */}
        <path d={FULL} fill="none" stroke="white" strokeWidth="0.35" opacity="0.65"/>
        <path d={FULL} fill="none" stroke="#00E5FF" strokeWidth="0.18" opacity="0.5"/>

        {/* Ground glow */}
        <ellipse cx="16" cy="32" rx="9" ry="1.2" fill="#00BFFF" opacity="0.25" filter="url(#e-soft)"/>
      </svg>
    </Floater>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BTC — Extruded cyan-glass ₿ symbol
   Reference: thick 3D glass ₿, cyan-blue, lit side bright, shadow dark
   ═══════════════════════════════════════════════════════════════ */
function BTCGlass() {
  const id = "btc";
  const S = 220;
  const P = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";

  return (
    <Floater id={id} spinDur={16} bobDur={4.5} tiltDeg={8} glow="#00BFFF" size={S}>
      <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
        <defs>
          <linearGradient id="b-main" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%"   stopColor="#B8F0FF" stopOpacity="0.92"/>
            <stop offset="30%"  stopColor="#00BFFF" stopOpacity="0.85"/>
            <stop offset="65%"  stopColor="#0077BB" stopOpacity="0.75"/>
            <stop offset="100%" stopColor="#003388" stopOpacity="0.88"/>
          </linearGradient>
          <radialGradient id="b-cau" cx="28%" cy="25%" r="45%">
            <stop offset="0%"  stopColor="white"   stopOpacity="0.7"/>
            <stop offset="40%" stopColor="#00E5FF" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="b-cau2" cx="70%" cy="72%" r="35%">
            <stop offset="0%"  stopColor="#00BFFF" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="b-rim" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%"   stopColor="white"   stopOpacity="1"/>
            <stop offset="50%"  stopColor="#00E5FF" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </linearGradient>
          <filter id="b-bloom"><feGaussianBlur stdDeviation="2"/></filter>
          <filter id="b-soft"><feGaussianBlur stdDeviation="0.35"/></filter>
          <clipPath id="b-clip"><path d={P}/></clipPath>
        </defs>

        {/* Back bloom */}
        <g filter="url(#b-bloom)" opacity="0.65">
          <path d={P} fill="#00BFFF"/>
        </g>

        {/* Extrusion depth (side faces, lit left/top, dark right/bottom) */}
        {[5,4,3,2,1].map(d => (
          <path key={d} d={P} fill={d > 3 ? "#001133" : "#002266"}
            opacity={0.30 - d * 0.04}
            transform={`translate(${d * 0.65},${d * 0.85})`}/>
        ))}
        {/* Left side extrusion - bright cyan (lit left side) */}
        {[3,2,1].map(d => (
          <path key={d} d={P} fill="#0099CC"
            opacity={0.15}
            transform={`translate(${-d * 0.4},${d * 0.3})`}/>
        ))}

        {/* Liquid inside */}
        <g clipPath="url(#b-clip)"><Liq id="b-liq" color="#00BFFF88" hi="#00E5FF"/></g>

        {/* Main glass face */}
        <path d={P} fill="url(#b-main)" opacity="0.88"/>

        {/* Caustic */}
        <path d={P} fill="url(#b-cau)"/>
        <path d={P} fill="url(#b-cau2)"/>

        {/* Prismatic refraction lines */}
        <g clipPath="url(#b-clip)" opacity="0.35">
          <line x1="-2" y1="12" x2="34" y2="10.5" stroke="white" strokeWidth="0.4" opacity="0.5"/>
          <line x1="-2" y1="16" x2="34" y2="14.5" stroke="#00E5FF" strokeWidth="0.22" opacity="0.35"/>
          <line x1="-2" y1="21" x2="34" y2="19.5" stroke="#0077BB" strokeWidth="0.2" opacity="0.3"/>
        </g>

        {/* Top-left highlight blob */}
        <g clipPath="url(#b-clip)">
          <ellipse cx="11" cy="8.5" rx="5" ry="3.5" fill="white" opacity="0.3"
            transform="rotate(-25,11,8.5)" filter="url(#b-soft)"/>
          <ellipse cx="10" cy="7.8" rx="2.2" ry="1.4" fill="white" opacity="0.65"
            transform="rotate(-25,10,7.8)"/>
        </g>

        {/* Chromatic aberration */}
        <path d={P} fill="none" stroke="rgba(255,80,80,0.18)" strokeWidth="0.9" transform="translate(-0.35,0)"/>
        <path d={P} fill="none" stroke="rgba(80,80,255,0.14)" strokeWidth="0.9" transform="translate(0.35,0)"/>

        {/* Rim light */}
        <path d={P} fill="none" stroke="url(#b-rim)" strokeWidth="0.5"/>
        <path d={P} fill="none" stroke="white" strokeWidth="0.2" opacity="0.6"/>

        {/* Ground glow */}
        <ellipse cx="16" cy="32" rx="8" ry="1.1" fill="#00BFFF" opacity="0.22" filter="url(#b-soft)"/>
      </svg>
    </Floater>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BNB — Gold glass: 2 chevrons + 3 diamonds
   Reference: 5 gold elements, exact positions
   ═══════════════════════════════════════════════════════════════ */
function BNBGlass() {
  const id = "bnb";
  const S = 220;

  // Top chevron (∧): two parallelogram bars meeting/nearly meeting at apex (16, 4)
  const TOP_L = "M5,14 L13,5 L16,5 L8,14 Z";
  const TOP_R = "M16,5 L24,5 L27,14 L19,14 Z";

  // 3 center diamonds
  const DIA_L = "M5,16.5 L8.5,13 L12,16.5 L8.5,20 Z";      // left small
  const DIA_C = "M12.5,16.5 L16,13 L19.5,16.5 L16,20 Z";    // center
  const DIA_R = "M20,16.5 L23.5,13 L27,16.5 L23.5,20 Z";    // right small

  // Bottom chevron (∨): mirror of top
  const BOT_L = "M5,19 L8,19 L16,28 L13,28 Z";
  const BOT_R = "M19,19 L27,19 L24,28 L16,28 Z";

  const ALL = [TOP_L, TOP_R, DIA_L, DIA_C, DIA_R, BOT_L, BOT_R];
  const FULL = ALL.join(" ");

  return (
    <Floater id={id} spinDur={18} bobDur={5.5} tiltDeg={7} glow="#F0B90B" size={S}>
      <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
        <defs>
          <linearGradient id="bnb-main" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%"   stopColor="#FFF0A0" stopOpacity="0.95"/>
            <stop offset="35%"  stopColor="#F0B90B" stopOpacity="0.88"/>
            <stop offset="70%"  stopColor="#CC8800" stopOpacity="0.78"/>
            <stop offset="100%" stopColor="#7a5500" stopOpacity="0.9"/>
          </linearGradient>
          <radialGradient id="bnb-cau" cx="30%" cy="25%" r="48%">
            <stop offset="0%"  stopColor="white"   stopOpacity="0.7"/>
            <stop offset="40%" stopColor="#FFE566" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="bnb-cau2" cx="68%" cy="70%" r="35%">
            <stop offset="0%"  stopColor="#FFD700" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="bnb-rim" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%"   stopColor="white"   stopOpacity="1"/>
            <stop offset="50%"  stopColor="#FFE566" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </linearGradient>
          <filter id="bnb-bloom"><feGaussianBlur stdDeviation="1.8"/></filter>
          <filter id="bnb-soft"><feGaussianBlur stdDeviation="0.32"/></filter>
          <clipPath id="bnb-clip"><path d={FULL}/></clipPath>
        </defs>

        {/* Bloom */}
        <g filter="url(#bnb-bloom)" opacity="0.55">
          <path d={FULL} fill="#F0B90B"/>
        </g>

        {/* Extrusion */}
        {[4,3,2,1].map(d => (
          <path key={d} d={FULL} fill="#3a2000" opacity={0.28 - d*0.05}
            transform={`translate(${d*.7},${d*.9})`}/>
        ))}

        {/* Liquid */}
        <g clipPath="url(#bnb-clip)"><Liq id="bnb-liq" color="#F0B90B88" hi="#FFE566"/></g>

        {/* Glass face per element for slight tonal variation */}
        {[TOP_L, TOP_R].map((p, i) => (
          <path key={i} d={p} fill="url(#bnb-main)" opacity={0.92}/>
        ))}
        <path d={DIA_L} fill="url(#bnb-main)" opacity="0.88"/>
        <path d={DIA_C} fill="url(#bnb-main)" opacity="0.92"/>
        <path d={DIA_R} fill="url(#bnb-main)" opacity="0.88"/>
        {[BOT_L, BOT_R].map((p, i) => (
          <path key={i} d={p} fill="url(#bnb-main)" opacity={0.85}/>
        ))}

        {/* Caustic */}
        <path d={FULL} fill="url(#bnb-cau)"/>
        <path d={FULL} fill="url(#bnb-cau2)"/>

        {/* Refraction lines */}
        <g clipPath="url(#bnb-clip)" opacity="0.3">
          <line x1="-2" y1="11" x2="34" y2="9.5" stroke="white" strokeWidth="0.4" opacity="0.5"/>
          <line x1="-2" y1="17" x2="34" y2="15.5" stroke="#FFE566" strokeWidth="0.22" opacity="0.3"/>
        </g>

        {/* Highlight blobs per element */}
        <g clipPath="url(#bnb-clip)">
          <ellipse cx="10" cy="7.5" rx="3.5" ry="2.5" fill="white" opacity="0.35"
            transform="rotate(-25,10,7.5)" filter="url(#bnb-soft)"/>
          <ellipse cx="9.2" cy="7" rx="1.6" ry="1" fill="white" opacity="0.7" transform="rotate(-25,9.2,7)"/>
          <ellipse cx="16" cy="14.5" rx="2.2" ry="1.4" fill="white" opacity="0.3" filter="url(#bnb-soft)"/>
        </g>

        {/* Chromatic aberration */}
        <path d={FULL} fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="0.8" transform="translate(-0.3,0)"/>
        <path d={FULL} fill="none" stroke="rgba(80,80,255,0.12)" strokeWidth="0.8" transform="translate(0.3,0)"/>

        {/* Rim */}
        <path d={FULL} fill="none" stroke="url(#bnb-rim)" strokeWidth="0.5"/>
        <path d={FULL} fill="none" stroke="white" strokeWidth="0.18" opacity="0.6"/>

        {/* Ground */}
        <ellipse cx="16" cy="32" rx="9" ry="1.1" fill="#F0B90B" opacity="0.22" filter="url(#bnb-soft)"/>
      </svg>
    </Floater>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOL — 3 gradient parallelogram bars (exact reference geometry)
   Top: mint-cyan | Mid: purple→cyan | Bot: purple→pink
   ═══════════════════════════════════════════════════════════════ */
const SOL_BARS = [
  { path: "M5,9    L25,9    L28.5,5.5  L8.5,5.5  Z", from: "#00F0C8", to: "#44D8B0", shadow: "#003322" },
  { path: "M5,17.5 L25,17.5 L28.5,14  L8.5,14   Z",  from: "#9945FF", to: "#00BFAA", shadow: "#1a0050" },
  { path: "M5,26   L25,26   L28.5,22.5 L8.5,22.5 Z", from: "#CC44FF", to: "#FF33AA", shadow: "#440033" },
];

function SOLGlass() {
  const id = "sol";
  const S = 220;

  return (
    <Floater id={id} spinDur={15} bobDur={4.8} tiltDeg={9} glow="#9945FF" size={S}>
      <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
        <defs>
          {SOL_BARS.map((b, i) => (
            <linearGradient key={i} id={`sol-g${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"  stopColor={b.from} stopOpacity="0.95"/>
              <stop offset="100%" stopColor={b.to}  stopOpacity="0.88"/>
            </linearGradient>
          ))}
          {SOL_BARS.map((b, i) => (
            <radialGradient key={i} id={`sol-hi${i}`} cx="28%" cy="28%" r="55%">
              <stop offset="0%"  stopColor="white" stopOpacity="0.65"/>
              <stop offset="50%" stopColor={b.from} stopOpacity="0.2"/>
              <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
            </radialGradient>
          ))}
          {SOL_BARS.map((b, i) => (
            <clipPath key={i} id={`sol-clip${i}`}><path d={b.path}/></clipPath>
          ))}
          <filter id="sol-bloom"><feGaussianBlur stdDeviation="1.8"/></filter>
          <filter id="sol-soft"><feGaussianBlur stdDeviation="0.3"/></filter>
        </defs>

        {/* Bloom glow */}
        {SOL_BARS.map((b, i) => (
          <g key={i} filter="url(#sol-bloom)" opacity="0.55">
            <path d={b.path} fill={b.from}/>
          </g>
        ))}

        {/* Per-bar rendering */}
        {SOL_BARS.map((b, i) => (
          <g key={i}>
            {/* Extrusion depth */}
            {[4,3,2,1].map(d => (
              <path key={d} d={b.path} fill={b.shadow}
                opacity={0.3 - d*0.05}
                transform={`translate(${d*.65},${d*.85})`}/>
            ))}

            {/* Liquid inside bar */}
            <g clipPath={`url(#sol-clip${i})`}>
              <Liq id={`sol-liq${i}`} color={b.from + "88"} hi={b.to}/>
            </g>

            {/* Bar face */}
            <path d={b.path} fill={`url(#sol-g${i})`} opacity="0.92"/>
            {/* Glass highlight */}
            <path d={b.path} fill={`url(#sol-hi${i})`}/>

            {/* Inner highlight blob */}
            <g clipPath={`url(#sol-clip${i})`}>
              <ellipse cx={String(9 + i)} cy={String(5.8 + i * 3.5)}
                rx="8" ry="1.6" fill="white" opacity="0.28"
                transform={`rotate(-11,${9+i},${5.8+i*3.5})`}
                filter="url(#sol-soft)"/>
            </g>

            {/* Chromatic aberration */}
            <path d={b.path} fill="none" stroke="rgba(255,80,80,0.13)" strokeWidth="0.8" transform="translate(-0.28,0)"/>
            <path d={b.path} fill="none" stroke="rgba(80,80,255,0.1)" strokeWidth="0.8" transform="translate(0.28,0)"/>

            {/* Rim */}
            <path d={b.path} fill="none" stroke="white" strokeWidth="0.28" opacity="0.55"/>
          </g>
        ))}

        {/* Ground */}
        <ellipse cx="17" cy="32" rx="10" ry="1.1" fill="#9945FF" opacity="0.22" filter="url(#sol-soft)"/>
      </svg>
    </Floater>
  );
}

/* ═══════════════════════════════════════════════════════════════
   POL — Purple glass dual interlocking hexagonal rings
   Reference: two C-shaped rings with gaps facing each other, interlocked
   ═══════════════════════════════════════════════════════════════ */
function POLGlass() {
  const id = "pol";
  const S = 220;

  // LEFT RING: center (12,13), outer r=7.8, inner r=5.0
  // Gap on RIGHT side (between R and BR vertices)
  // Outer vertices (flat-top hex):
  // TL(8.1,6.24) TR(15.9,6.24) R(19.8,13) BR(15.9,19.76) BL(8.1,19.76) L(4.2,13)
  // Inner vertices (r=5):
  // TL(9.5,8.67) TR(14.5,8.67) R(17,13) BR(14.5,17.33) BL(9.5,17.33) L(7,13)
  //
  // C-shape: outer goes CCW from R→TL→TR(skip R→BR) then inner CW from BR→BL→L→TL→TR→R
  const LEFT_RING =
    "M19.8,13 L15.9,6.24 L8.1,6.24 L4.2,13 L8.1,19.76 L15.9,19.76" +  // outer 5 sides (gap between R and BR)
    " L14.5,17.33 L9.5,17.33 L7,13 L9.5,8.67 L14.5,8.67 L17,13 Z";    // inner 5 sides back

  // RIGHT RING: center (20,19), outer r=7.8, inner r=5.0
  // Gap on LEFT side (between L and TL vertices)
  // Outer TL(16.1,12.24) TR(23.9,12.24) R(27.8,19) BR(23.9,25.76) BL(16.1,25.76) L(12.2,19)
  // Inner TL(17.5,15.67) TR(22.5,15.67) R(25,19) BR(22.5,22.33) BL(17.5,22.33) L(15,19)
  //
  // C-shape: outer goes CW from TL→TR→R→BR→BL→L(skip L→TL) then inner CCW from L→BL→BR→R→TR→TL
  const RIGHT_RING =
    "M16.1,12.24 L23.9,12.24 L27.8,19 L23.9,25.76 L16.1,25.76 L12.2,19" +  // outer 5 sides (gap L→TL skipped)
    " L15,19 L17.5,22.33 L22.5,22.33 L25,19 L22.5,15.67 L17.5,15.67 Z";     // inner 5 sides back

  const BOTH = `${LEFT_RING} ${RIGHT_RING}`;

  return (
    <Floater id={id} spinDur={13} bobDur={5.2} tiltDeg={8} glow="#8247E5" size={S}>
      <svg viewBox="0 0 32 32" width={S} height={S} overflow="visible">
        <defs>
          <linearGradient id="pol-main" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%"   stopColor="#D0A0FF" stopOpacity="0.95"/>
            <stop offset="35%"  stopColor="#8247E5" stopOpacity="0.88"/>
            <stop offset="70%"  stopColor="#5B2DB0" stopOpacity="0.78"/>
            <stop offset="100%" stopColor="#2E1060" stopOpacity="0.9"/>
          </linearGradient>
          <radialGradient id="pol-cau" cx="28%" cy="25%" r="46%">
            <stop offset="0%"  stopColor="white"   stopOpacity="0.65"/>
            <stop offset="40%" stopColor="#C090FF" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="pol-cau2" cx="68%" cy="70%" r="32%">
            <stop offset="0%"  stopColor="#8247E5" stopOpacity="0.45"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="pol-rim" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%"   stopColor="white"   stopOpacity="1"/>
            <stop offset="50%"  stopColor="#C090FF" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </linearGradient>
          <filter id="pol-bloom"><feGaussianBlur stdDeviation="2"/></filter>
          <filter id="pol-soft"><feGaussianBlur stdDeviation="0.32"/></filter>
          <filter id="pol-round">
            <feGaussianBlur stdDeviation="0.7" result="b"/>
            <feColorMatrix in="b" type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 25 -10"/>
          </filter>
          <clipPath id="pol-clip-l"><path d={LEFT_RING}/></clipPath>
          <clipPath id="pol-clip-r"><path d={RIGHT_RING}/></clipPath>
          <clipPath id="pol-clip-a"><path d={BOTH}/></clipPath>
        </defs>

        {/* Bloom */}
        <g filter="url(#pol-bloom)" opacity="0.6">
          <path d={BOTH} fill="#8247E5"/>
        </g>

        {/* Extrusion depth */}
        {[4,3,2,1].map(d => (
          <path key={d} d={BOTH} fill="#1a0040" opacity={0.28 - d*0.05}
            transform={`translate(${d*.65},${d*.85})`}/>
        ))}

        {/* Liquid in each ring */}
        <g clipPath="url(#pol-clip-l)"><Liq id="pol-liq-l" color="#8247E588" hi="#C090FF"/></g>
        <g clipPath="url(#pol-clip-r)"><Liq id="pol-liq-r" color="#8247E588" hi="#C090FF"/></g>

        {/* Glass face — rounded via filter trick */}
        <g filter="url(#pol-round)">
          <path d={LEFT_RING}  fill="url(#pol-main)" opacity="0.92"/>
          <path d={RIGHT_RING} fill="url(#pol-main)" opacity="0.88"/>
        </g>

        {/* Caustic */}
        <path d={BOTH} fill="url(#pol-cau)"/>
        <path d={BOTH} fill="url(#pol-cau2)"/>

        {/* Refraction lines */}
        <g clipPath="url(#pol-clip-a)" opacity="0.32">
          <line x1="-2" y1="11" x2="34" y2="9.5"  stroke="white" strokeWidth="0.4" opacity="0.5"/>
          <line x1="-2" y1="20" x2="34" y2="18.5" stroke="#C090FF" strokeWidth="0.22" opacity="0.3"/>
        </g>

        {/* Highlight blobs */}
        <g clipPath="url(#pol-clip-l)">
          <ellipse cx="9.5" cy="8" rx="4" ry="2.8" fill="white" opacity="0.32"
            transform="rotate(-25,9.5,8)" filter="url(#pol-soft)"/>
          <ellipse cx="8.8" cy="7.4" rx="1.8" ry="1.1" fill="white" opacity="0.65"
            transform="rotate(-25,8.8,7.4)"/>
        </g>
        <g clipPath="url(#pol-clip-r)">
          <ellipse cx="18" cy="14" rx="4" ry="2.8" fill="white" opacity="0.25"
            transform="rotate(-25,18,14)" filter="url(#pol-soft)"/>
        </g>

        {/* Chromatic aberration */}
        <path d={BOTH} fill="none" stroke="rgba(255,80,80,0.15)" strokeWidth="0.8" transform="translate(-0.3,0)"/>
        <path d={BOTH} fill="none" stroke="rgba(80,80,255,0.12)" strokeWidth="0.8" transform="translate(0.3,0)"/>

        {/* Rim */}
        <path d={BOTH} fill="none" stroke="url(#pol-rim)" strokeWidth="0.5"/>
        <path d={BOTH} fill="none" stroke="white" strokeWidth="0.18" opacity="0.6"/>

        {/* Ground */}
        <ellipse cx="17" cy="32" rx="9" ry="1.1" fill="#8247E5" opacity="0.22" filter="url(#pol-soft)"/>
      </svg>
    </Floater>
  );
}

/* ─── Main display ───────────────────────────────────────────── */
export default function GlassTokens() {
  return (
    <div style={{
      minHeight: "100vh", background: "#060910", color: "#fff",
      fontFamily: "system-ui,-apple-system,sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px 60px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <h1 style={{
          fontSize: 24, fontWeight: 800, marginBottom: 8,
          background: "linear-gradient(90deg,#00ff88,#00e5ff,#a855f7)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          3D Glass Tokens
        </h1>
        <p style={{ color: "rgba(255,255,255,.28)", fontSize: 13 }}>
          Точные формы · Стекло + жидкость внутри · Вращается · Парит
        </p>
      </div>

      <div style={{
        display: "flex", justifyContent: "center",
        gap: 32, flexWrap: "wrap", alignItems: "center",
        maxWidth: 1300,
      }}>
        <div style={{ textAlign: "center" }}>
          <ETHCrystal/>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>ETH</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BTCGlass/>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>BTC</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <BNBGlass/>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>BNB</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <SOLGlass/>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>SOL</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <POLGlass/>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 8, letterSpacing: 2, fontWeight: 700 }}>POL</div>
        </div>
      </div>

      <div style={{
        marginTop: 56, padding: "16px 28px", borderRadius: 14,
        background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)",
        color: "rgba(255,255,255,.3)", fontSize: 13, textAlign: "center",
      }}>
        Скажи что скорректировать, или <b style={{ color: "#00e5ff" }}>применить на биржу</b> и задеплоить
      </div>
    </div>
  );
}
