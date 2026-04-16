/**
 * 3D Glass Tokens — iridescent liquid inside transparent glass
 * Style: soap-bubble / oil-slick rainbow liquid, crystal-clear glass shell
 * ETH: octahedron | BTC: ₿ | BNB: diamond ring | SOL: 3 bars | POL: dual rings
 */

/* ──────────────────────────────────────────────────────────────
   Shared: iridescent liquid & glass material keyframes
   ────────────────────────────────────────────────────────────── */
const SHARED_CSS = `
@keyframes iri-spin   { 0%{filter:hue-rotate(0deg) saturate(1.4) brightness(1.1)} 100%{filter:hue-rotate(360deg) saturate(1.4) brightness(1.1)} }
@keyframes liq-slosh1 { 0%,100%{transform:translateX(0) translateY(0) scale(1)} 33%{transform:translateX(6px) translateY(-5px) scale(1.04)} 66%{transform:translateX(-5px) translateY(-8px) scale(0.96)} }
@keyframes liq-slosh2 { 0%,100%{transform:translateX(0) scale(1)} 40%{transform:translateX(-4px) scale(0.9)} 70%{transform:translateX(5px) scale(1.1)} }
@keyframes glass-pulse { 0%,100%{opacity:0.18} 50%{opacity:0.32} }
`;

/* per-token bob + spin (inserted once per token) */
function tokenCSS(id: string, spinDur: number, bobAmt: number, bobDur: number, tiltDeg: number) {
  return `
@keyframes g3-bob-${id}  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-${bobAmt}px)} }
@keyframes g3-spin-${id} { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
@keyframes g3-tilt-${id} { 0%,100%{transform:rotateX(${tiltDeg}deg) rotateZ(-2deg)} 50%{transform:rotateX(-${tiltDeg*0.6}deg) rotateZ(2deg)} }
`;
}

/* ──────────────────────────────────────────────────────────────
   SHARED TOKEN WRAPPER
   ────────────────────────────────────────────────────────────── */
function GlassBase({
  id, spinDur = 14, bobDur = 5, bobAmt = 16, tiltDeg = 8, glow = "rgba(200,200,255,0.5)",
  size = 160, delay = 0, children,
}: {
  id: string; spinDur?: number; bobDur?: number; bobAmt?: number;
  tiltDeg?: number; glow?: string; size?: number; delay?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ width: size, height: size, filter: `drop-shadow(0 20px 50px ${glow}) drop-shadow(0 0 80px ${glow})` }}>
      <style>{SHARED_CSS}{tokenCSS(id, spinDur, bobAmt, bobDur, tiltDeg)}</style>
      <div style={{ animation: `g3-bob-${id} ${bobDur}s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <div style={{
          animation: `g3-spin-${id} ${spinDur}s linear infinite`,
          animationDelay: `${delay * 0.5}s`,
          perspective: "700px", transformStyle: "preserve-3d",
          width: size, height: size,
        }}>
          <div style={{
            animation: `g3-tilt-${id} ${bobDur * 1.35}s ease-in-out infinite`,
            animationDelay: `${delay * 0.7}s`,
            transformStyle: "preserve-3d", width: size, height: size,
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   IRIDESCENT LIQUID LAYER (rainbow soap-bubble effect)
   ────────────────────────────────────────────────────────────── */
function IriLiquid({ clipId, cx = "50%", cy = "75%" }: { clipId: string; cx?: string; cy?: string }) {
  return (
    <g clipPath={`url(#${clipId})`} style={{ animation: "liq-slosh1 9s ease-in-out infinite" }}>
      {/* Base rainbow gradient */}
      <g style={{ animation: "iri-spin 8s linear infinite" }}>
        <ellipse cx="50%" cy="68%" rx="58%" ry="45%"
          fill="url(#iri-base)" opacity="0.85"/>
      </g>
      {/* Secondary swirl */}
      <g style={{ animation: "iri-spin 12s linear infinite reverse", transformOrigin: "50% 50%" }}>
        <ellipse cx="42%" cy="60%" rx="40%" ry="30%"
          fill="url(#iri-sec)" opacity="0.55"/>
      </g>
      {/* Liquid surface shimmer */}
      <g style={{ animation: "liq-slosh2 7s ease-in-out infinite" }}>
        <ellipse cx="50%" cy="55%" rx="48%" ry="6%" fill="white" opacity="0.22"/>
        <ellipse cx="40%" cy="54%" rx="18%" ry="2.5%" fill="white" opacity="0.38"/>
      </g>
      {/* Water droplets */}
      <circle cx="55%" cy="35%" r="1%" fill="white" opacity="0.5" style={{animation:"glass-pulse 3s ease-in-out infinite"}}/>
      <circle cx="35%" cy="28%" r="0.7%" fill="white" opacity="0.45" style={{animation:"glass-pulse 4s ease-in-out infinite 1s"}}/>
      <circle cx="65%" cy="40%" r="0.8%" fill="white" opacity="0.4" style={{animation:"glass-pulse 5s ease-in-out infinite 2s"}}/>
    </g>
  );
}

/* shared SVG defs (gradients) - included once per SVG */
function IriDefs() {
  return (
    <defs>
      {/* Rainbow iridescent base: pink → cyan → gold */}
      <linearGradient id="iri-base" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#FF55CC"/>
        <stop offset="25%"  stopColor="#CC55FF"/>
        <stop offset="50%"  stopColor="#00D4FF"/>
        <stop offset="75%"  stopColor="#00FFB0"/>
        <stop offset="100%" stopColor="#FFD700"/>
      </linearGradient>
      {/* Secondary iridescent: teal → magenta */}
      <linearGradient id="iri-sec" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#FF6699"/>
        <stop offset="40%"  stopColor="#FFAA00"/>
        <stop offset="80%"  stopColor="#00CCFF"/>
        <stop offset="100%" stopColor="#AA55FF"/>
      </linearGradient>
      {/* Glass: transparent white shell */}
      <linearGradient id="glass-lit" x1="0.1" y1="0" x2="0.9" y2="1">
        <stop offset="0%"   stopColor="white" stopOpacity="0.55"/>
        <stop offset="30%"  stopColor="white" stopOpacity="0.12"/>
        <stop offset="70%"  stopColor="white" stopOpacity="0.06"/>
        <stop offset="100%" stopColor="white" stopOpacity="0.22"/>
      </linearGradient>
      {/* Glass dark face */}
      <linearGradient id="glass-dark" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#111" stopOpacity="0.55"/>
        <stop offset="100%" stopColor="#000" stopOpacity="0.75"/>
      </linearGradient>
      {/* Rim gradient */}
      <linearGradient id="rim-grad" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0%"   stopColor="white" stopOpacity="0.9"/>
        <stop offset="40%"  stopColor="white" stopOpacity="0.3"/>
        <stop offset="100%" stopColor="white" stopOpacity="0.05"/>
      </linearGradient>
      <filter id="gl-blur"><feGaussianBlur stdDeviation="0.3"/></filter>
      <filter id="gl-bloom"><feGaussianBlur stdDeviation="2.5"/></filter>
      <filter id="gl-round">
        <feGaussianBlur stdDeviation="0.8" result="b"/>
        <feColorMatrix in="b" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 18 -8"/>
      </filter>
    </defs>
  );
}

/* ══════════════════════════════════════════════════════════════
   ETH — Crystal octahedron with iridescent liquid
   ══════════════════════════════════════════════════════════════ */
const ETH_FULL = "M16,4 L8,16 L16,20 L24,16 Z M8,17.5 L16,21.5 L24,17.5 L16,29 Z";
const ETH_FA = "M16,4 L8,16 L16,11 Z";
const ETH_FB = "M16,4 L24,16 L16,11 Z";
const ETH_FC = "M8,16 L16,20 L16,11 Z";
const ETH_FD = "M24,16 L16,20 L16,11 Z";
const ETH_FE = "M8,17.5 L16,21.5 L24,17.5 Z";
const ETH_FF = "M8,17.5 L16,29 L16,23 Z";
const ETH_FG = "M24,17.5 L16,29 L16,23 Z";

export function ETHGlass({ size = 160, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassBase id="eth" spinDur={14} bobDur={5} bobAmt={14} tiltDeg={9} size={size} delay={delay}
      glow="rgba(160,200,255,0.4)">
      <svg viewBox="0 0 32 32" width={size} height={size} overflow="visible">
        <IriDefs/>
        <defs>
          <clipPath id="eth-clip"><path d={ETH_FULL}/></clipPath>
        </defs>
        {/* Back bloom */}
        <g filter="url(#gl-bloom)" opacity="0.5"><path d={ETH_FULL} fill="rgba(200,220,255,0.5)"/></g>
        {/* Extrusion */}
        {[3,2,1].map(d=><path key={d} d={ETH_FULL} fill="#111" opacity={0.6-d*0.1} transform={`translate(${d*.7},${d*.9})`}/>)}
        {/* Iridescent liquid inside */}
        <IriLiquid clipId="eth-clip"/>
        {/* Glass faces — semi-transparent, dark background shows through */}
        <path d={ETH_FA} fill="url(#glass-lit)" opacity="0.7"/>
        <path d={ETH_FB} fill="url(#glass-dark)" opacity="0.45"/>
        <path d={ETH_FC} fill="url(#glass-dark)" opacity="0.5"/>
        <path d={ETH_FD} fill="url(#glass-dark)" opacity="0.6"/>
        <path d={ETH_FE} fill="url(#glass-lit)" opacity="0.4"/>
        <path d={ETH_FF} fill="url(#glass-dark)" opacity="0.55"/>
        <path d={ETH_FG} fill="url(#glass-dark)" opacity="0.65"/>
        {/* Crease lines */}
        <line x1="16" y1="4" x2="16" y2="11" stroke="white" strokeWidth="0.2" opacity="0.6"/>
        <line x1="8" y1="16" x2="24" y2="16" stroke="white" strokeWidth="0.25" opacity="0.5"/>
        {/* Top specular */}
        <g clipPath="url(#eth-clip)">
          <ellipse cx="10" cy="7" rx="4.5" ry="3" fill="white" opacity="0.5" transform="rotate(-28,10,7)" filter="url(#gl-blur)"/>
          <ellipse cx="9.2" cy="6.5" rx="2" ry="1.2" fill="white" opacity="0.85" transform="rotate(-28,9.2,6.5)"/>
        </g>
        {/* Chromatic aberration */}
        <path d={ETH_FULL} fill="none" stroke="rgba(255,100,150,0.2)" strokeWidth="0.7" transform="translate(-0.35,0)"/>
        <path d={ETH_FULL} fill="none" stroke="rgba(100,200,255,0.15)" strokeWidth="0.7" transform="translate(0.35,0)"/>
        {/* Rim */}
        <path d={ETH_FULL} fill="none" stroke="url(#rim-grad)" strokeWidth="0.55"/>
        <path d={ETH_FULL} fill="none" stroke="white" strokeWidth="0.18" opacity="0.7"/>
        {/* Ground reflect */}
        <ellipse cx="16" cy="32" rx="8" ry="1" fill="rgba(180,210,255,0.25)" filter="url(#gl-blur)"/>
      </svg>
    </GlassBase>
  );
}

/* ══════════════════════════════════════════════════════════════
   BTC — Extruded ₿ with iridescent liquid
   ══════════════════════════════════════════════════════════════ */
const BTC_P = "M22.5 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6-1.3-.3.7-2.6-1.7-.4-.7 2.7-1-.3v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8.9l-2 7.9c-.1.3-.4.6-.9.5l-1.2-.3-.8 1.9 2.2.6 1.2.3-.7 2.8 1.7.4.7-2.8 1.3.3-.7 2.8 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2-.03-3.2-1.5-3.9.95-.4 1.7-1.1 1.9-2.3zm-3.4 4.8c-.5 2-3.9 1-5 .7l.9-3.5c1.1.3 4.7.8 4.1 2.8zm.5-4.8c-.5 1.8-3.3 1-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z";

export function BTCGlass({ size = 160, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassBase id="btc" spinDur={16} bobDur={4.5} bobAmt={13} tiltDeg={8} size={size} delay={delay}
      glow="rgba(180,180,255,0.35)">
      <svg viewBox="0 0 32 32" width={size} height={size} overflow="visible">
        <IriDefs/>
        <defs>
          <clipPath id="btc-clip"><path d={BTC_P}/></clipPath>
        </defs>
        {/* Bloom */}
        <g filter="url(#gl-bloom)" opacity="0.45"><path d={BTC_P} fill="rgba(200,200,255,0.5)"/></g>
        {/* Extrusion — side faces visible on right/bottom */}
        {[5,4,3,2,1].map(d=><path key={d} d={BTC_P} fill="#0a0a14" opacity={0.5-d*0.06} transform={`translate(${d*.6},${d*.8})`}/>)}
        {/* Lit left-side extrusion */}
        {[2,1].map(d=><path key={d} d={BTC_P} fill="rgba(200,180,255,0.15)" transform={`translate(${-d*.3},${d*.2})`}/>)}
        {/* Iridescent liquid */}
        <IriLiquid clipId="btc-clip"/>
        {/* Glass overlay */}
        <path d={BTC_P} fill="url(#glass-dark)" opacity="0.4"/>
        <path d={BTC_P} fill="url(#glass-lit)" opacity="0.55"/>
        {/* Refraction lines */}
        <g clipPath="url(#btc-clip)" opacity="0.3">
          <line x1="-2" y1="13" x2="34" y2="11" stroke="white" strokeWidth="0.4"/>
          <line x1="-2" y1="19" x2="34" y2="17" stroke="rgba(150,220,255,0.6)" strokeWidth="0.22"/>
        </g>
        {/* Top-left specular */}
        <g clipPath="url(#btc-clip)">
          <ellipse cx="11" cy="8" rx="5" ry="3.5" fill="white" opacity="0.35" transform="rotate(-25,11,8)" filter="url(#gl-blur)"/>
          <ellipse cx="10" cy="7.3" rx="2.2" ry="1.4" fill="white" opacity="0.75" transform="rotate(-25,10,7.3)"/>
        </g>
        {/* Chroma */}
        <path d={BTC_P} fill="none" stroke="rgba(255,80,180,0.2)" strokeWidth="0.9" transform="translate(-0.35,0)"/>
        <path d={BTC_P} fill="none" stroke="rgba(80,200,255,0.15)" strokeWidth="0.9" transform="translate(0.35,0)"/>
        {/* Rim */}
        <path d={BTC_P} fill="none" stroke="url(#rim-grad)" strokeWidth="0.5"/>
        <path d={BTC_P} fill="none" stroke="white" strokeWidth="0.18" opacity="0.65"/>
        <ellipse cx="16" cy="32" rx="7" ry="1" fill="rgba(180,180,255,0.22)" filter="url(#gl-blur)"/>
      </svg>
    </GlassBase>
  );
}

/* ══════════════════════════════════════════════════════════════
   BNB — Diamond ring (outer diamond – inner diamond cutout) + center gem
   Reference: diamond-frame glass shape with rainbow liquid
   ══════════════════════════════════════════════════════════════ */
// Outer diamond ring: large diamond minus smaller diamond (fill-rule evenodd)
// Outer diamond: M16,3 L29,16 L16,29 L3,16 Z  (13-unit half-width)
// Inner hole:    M16,9 L23,16 L16,23 L9,16 Z   (7-unit half-width)
// Center gem:    M16,13 L19,16 L16,19 L13,16 Z  (3-unit half-width)
const BNB_RING = "M16,3 L29,16 L16,29 L3,16 Z M16,9 L23,16 L16,23 L9,16 Z";
const BNB_GEM  = "M16,13 L19,16 L16,19 L13,16 Z";
const BNB_ALL  = `${BNB_RING} ${BNB_GEM}`;

export function BNBGlass({ size = 160, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassBase id="bnb" spinDur={18} bobDur={5.5} bobAmt={15} tiltDeg={7} size={size} delay={delay}
      glow="rgba(200,170,255,0.35)">
      <svg viewBox="0 0 32 32" width={size} height={size} overflow="visible">
        <IriDefs/>
        <defs>
          {/* Clip for ring only (evenodd so the hole is transparent) */}
          <clipPath id="bnb-ring-clip" clipPathUnits="userSpaceOnUse">
            <path d={BNB_RING} fillRule="evenodd"/>
          </clipPath>
          <clipPath id="bnb-gem-clip"><path d={BNB_GEM}/></clipPath>
        </defs>
        {/* Bloom */}
        <g filter="url(#gl-bloom)" opacity="0.4"><path d={BNB_RING} fill="rgba(220,200,255,0.5)" fillRule="evenodd"/></g>
        {/* Extrusion */}
        {[4,3,2,1].map(d=><path key={d} d={BNB_RING} fill="#0a0a14" opacity={0.45-d*0.06} fillRule="evenodd" transform={`translate(${d*.65},${d*.85})`}/>)}
        {/* Liquid in ring */}
        <g clipPath="url(#bnb-ring-clip)"><IriLiquid clipId="bnb-ring-clip"/></g>
        {/* Glass ring overlay */}
        <path d={BNB_RING} fill="url(#glass-dark)" fillRule="evenodd" opacity="0.38"/>
        <path d={BNB_RING} fill="url(#glass-lit)" fillRule="evenodd" opacity="0.5"/>
        {/* Ring extrusion corners - bright specular on each corner */}
        {[{x:16,y:3},{x:29,y:16},{x:16,y:29},{x:3,y:16}].map((pt,i)=>(
          <circle key={i} cx={pt.x} cy={pt.y} r="1.2" fill="white" opacity="0.7" filter="url(#gl-blur)"/>
        ))}
        {/* Specular highlight on top-left of ring */}
        <g clipPath="url(#bnb-ring-clip)">
          <ellipse cx="11" cy="8" rx="5" ry="3.5" fill="white" opacity="0.4" transform="rotate(-40,11,8)" filter="url(#gl-blur)"/>
          <ellipse cx="10.5" cy="7.5" rx="2.2" ry="1.4" fill="white" opacity="0.75" transform="rotate(-40,10.5,7.5)"/>
        </g>
        {/* Center gem */}
        <g filter="url(#gl-bloom)" opacity="0.6"><path d={BNB_GEM} fill="rgba(200,200,255,0.8)"/></g>
        <g clipPath="url(#bnb-gem-clip)"><IriLiquid clipId="bnb-gem-clip"/></g>
        <path d={BNB_GEM} fill="url(#glass-lit)" opacity="0.75"/>
        <path d={BNB_GEM} fill="none" stroke="white" strokeWidth="0.3" opacity="0.8"/>
        {/* Ring rim */}
        <path d={BNB_RING} fill="none" stroke="url(#rim-grad)" strokeWidth="0.55" fillRule="evenodd"/>
        <path d={BNB_RING} fill="none" stroke="white" strokeWidth="0.2" opacity="0.65" fillRule="evenodd"/>
        {/* Chroma */}
        <path d={BNB_RING} fill="none" fillRule="evenodd" stroke="rgba(255,80,180,0.18)" strokeWidth="0.9" transform="translate(-0.3,0)"/>
        <path d={BNB_RING} fill="none" fillRule="evenodd" stroke="rgba(80,200,255,0.14)" strokeWidth="0.9" transform="translate(0.3,0)"/>
        <ellipse cx="16" cy="32" rx="9" ry="1.1" fill="rgba(180,180,255,0.22)" filter="url(#gl-blur)"/>
      </svg>
    </GlassBase>
  );
}

/* ══════════════════════════════════════════════════════════════
   SOL — 3 glass parallelogram bars with iridescent liquid
   ══════════════════════════════════════════════════════════════ */
const SOL_BARS_DEF = [
  { path: "M5,9    L25,9    L28.5,5.5  L8.5,5.5  Z", id: "sol0" },
  { path: "M5,17.5 L25,17.5 L28.5,14  L8.5,14   Z", id: "sol1" },
  { path: "M5,26   L25,26   L28.5,22.5 L8.5,22.5 Z", id: "sol2" },
];

export function SOLGlass({ size = 160, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassBase id="sol" spinDur={15} bobDur={4.8} bobAmt={14} tiltDeg={9} size={size} delay={delay}
      glow="rgba(180,150,255,0.35)">
      <svg viewBox="0 0 32 32" width={size} height={size} overflow="visible">
        <IriDefs/>
        <defs>
          {SOL_BARS_DEF.map(b=><clipPath key={b.id} id={`${b.id}-clip`}><path d={b.path}/></clipPath>)}
        </defs>
        {SOL_BARS_DEF.map((b, i) => (
          <g key={b.id}>
            {/* Bloom */}
            <g filter="url(#gl-bloom)" opacity="0.4"><path d={b.path} fill="rgba(180,150,255,0.5)"/></g>
            {/* Extrusion */}
            {[4,3,2,1].map(d=><path key={d} d={b.path} fill="#0a0a14" opacity={0.45-d*0.06} transform={`translate(${d*.6},${d*.8})`}/>)}
            {/* Liquid */}
            <IriLiquid clipId={`${b.id}-clip`}/>
            {/* Glass overlay */}
            <path d={b.path} fill="url(#glass-dark)" opacity="0.35"/>
            <path d={b.path} fill="url(#glass-lit)" opacity="0.5"/>
            {/* Specular highlight */}
            <g clipPath={`url(#${b.id}-clip)`}>
              <ellipse cx={String(8+i)} cy={String(6+i*3.5)} rx="8" ry="1.8"
                fill="white" opacity="0.3" transform={`rotate(-12,${8+i},${6+i*3.5})`} filter="url(#gl-blur)"/>
            </g>
            {/* Rim */}
            <path d={b.path} fill="none" stroke="white" strokeWidth="0.3" opacity="0.6"/>
            <path d={b.path} fill="none" stroke="rgba(255,80,180,0.18)" strokeWidth="0.8" transform="translate(-0.28,0)"/>
            <path d={b.path} fill="none" stroke="rgba(80,200,255,0.14)" strokeWidth="0.8" transform="translate(0.28,0)"/>
          </g>
        ))}
        {/* Bloom per corner of each bar */}
        <ellipse cx="17" cy="32" rx="9" ry="1.1" fill="rgba(180,150,255,0.22)" filter="url(#gl-blur)"/>
      </svg>
    </GlassBase>
  );
}

/* ══════════════════════════════════════════════════════════════
   POL — Dual interlocking C-shaped hexagonal glass rings
   ══════════════════════════════════════════════════════════════ */
// Left ring C-shape: outer hex going CCW from R, then inner hex back, with gap on right
const POL_L =
  "M19.5,13 L15.75,6.24 L8.25,6.24 L4.5,13 L8.25,19.76 L15.75,19.76" +
  " L14.5,17.33 L9.5,17.33 L7,13 L9.5,8.67 L14.5,8.67 L17,13 Z";
// Right ring C-shape: outer hex going CW from TL, then inner hex back, with gap on left
const POL_R =
  "M16.25,13.24 L23.75,13.24 L27.5,20 L23.75,26.76 L16.25,26.76 L12.5,20" +
  " L15,20 L17.5,23.33 L22.5,23.33 L25,20 L22.5,16.67 L17.5,16.67 Z";
const POL_ALL = `${POL_L} ${POL_R}`;

export function POLGlass({ size = 160, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassBase id="pol" spinDur={13} bobDur={5.2} bobAmt={15} tiltDeg={8} size={size} delay={delay}
      glow="rgba(180,150,255,0.4)">
      <svg viewBox="0 0 32 32" width={size} height={size} overflow="visible">
        <IriDefs/>
        <defs>
          <clipPath id="pol-l-clip"><path d={POL_L}/></clipPath>
          <clipPath id="pol-r-clip"><path d={POL_R}/></clipPath>
        </defs>
        {/* Bloom */}
        <g filter="url(#gl-bloom)" opacity="0.45"><path d={POL_ALL} fill="rgba(180,150,255,0.5)"/></g>
        {/* Extrusion */}
        {[4,3,2,1].map(d=><path key={d} d={POL_ALL} fill="#0a0a14" opacity={0.45-d*0.06} transform={`translate(${d*.6},${d*.8})`}/>)}
        {/* Liquid in left ring */}
        <g clipPath="url(#pol-l-clip)"><IriLiquid clipId="pol-l-clip" cx="40%" cy="65%"/></g>
        {/* Liquid in right ring */}
        <g clipPath="url(#pol-r-clip)"><IriLiquid clipId="pol-r-clip" cx="60%" cy="72%"/></g>
        {/* Glass overlay — rounded via filter */}
        <g filter="url(#gl-round)">
          <path d={POL_L} fill="url(#glass-dark)" opacity="0.38"/>
          <path d={POL_L} fill="url(#glass-lit)" opacity="0.5"/>
          <path d={POL_R} fill="url(#glass-dark)" opacity="0.42"/>
          <path d={POL_R} fill="url(#glass-lit)" opacity="0.45"/>
        </g>
        {/* Specular on each ring */}
        <g clipPath="url(#pol-l-clip)">
          <ellipse cx="9.5" cy="8" rx="4" ry="2.8" fill="white" opacity="0.4" transform="rotate(-25,9.5,8)" filter="url(#gl-blur)"/>
          <ellipse cx="8.8" cy="7.5" rx="1.8" ry="1.1" fill="white" opacity="0.8" transform="rotate(-25,8.8,7.5)"/>
        </g>
        <g clipPath="url(#pol-r-clip)">
          <ellipse cx="18.5" cy="15" rx="4" ry="2.8" fill="white" opacity="0.3" transform="rotate(-25,18.5,15)" filter="url(#gl-blur)"/>
        </g>
        {/* Chroma */}
        <path d={POL_ALL} fill="none" stroke="rgba(255,80,180,0.18)" strokeWidth="0.8" transform="translate(-0.3,0)"/>
        <path d={POL_ALL} fill="none" stroke="rgba(80,200,255,0.14)" strokeWidth="0.8" transform="translate(0.3,0)"/>
        {/* Rim */}
        <path d={POL_ALL} fill="none" stroke="url(#rim-grad)" strokeWidth="0.55"/>
        <path d={POL_ALL} fill="none" stroke="white" strokeWidth="0.18" opacity="0.65"/>
        <ellipse cx="17" cy="33" rx="9" ry="1.1" fill="rgba(180,150,255,0.22)" filter="url(#gl-blur)"/>
      </svg>
    </GlassBase>
  );
}
