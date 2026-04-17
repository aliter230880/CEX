/**
 * 3D Glass Tokens — mix-blend-mode: screen removes dark JPG background
 * Dark pixels become transparent on the dark page (#050912).
 * Bright colored glass parts float without any background box.
 */

const CSS = `
@keyframes gt-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-32px)} }
@keyframes gt-tilt {
  0%   { transform: perspective(900px) rotateY(-12deg) rotateX(8deg) rotateZ(-3deg); }
  33%  { transform: perspective(900px) rotateY(8deg)  rotateX(-6deg) rotateZ(2deg);  }
  66%  { transform: perspective(900px) rotateY(14deg) rotateX(4deg)  rotateZ(-2deg); }
  100% { transform: perspective(900px) rotateY(-12deg) rotateX(8deg) rotateZ(-3deg); }
}
@keyframes gt-glow { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

interface TokenProps { size?: number; delay?: number; }

function GlassImg({ src, size, delay, bobDur, tiltDur, glow, glow2 }:
  { src: string; size: number; delay: number; bobDur: number; tiltDur: number; glow: string; glow2?: string }) {
  injectCSS();

  return (
    /* Outer wrapper — just positioning, no background */
    <div style={{ width: size, height: size, position: "relative" }}>

      {/* === GLOW BLOB behind the token === */}
      <div style={{
        position: "absolute",
        inset: "-40%",
        background: glow2
          ? `radial-gradient(ellipse 70% 70% at 40% 50%, ${glow} 0%, ${glow2} 50%, transparent 80%)`
          : `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 70%)`,
        animation: `gt-glow ${bobDur * 0.9}s ease-in-out infinite`,
        animationDelay: `${delay * 0.6}s`,
        zIndex: 0,
        pointerEvents: "none",
        filter: "blur(30px)",
      }} />

      {/* === BOB (float up-down) === */}
      <div style={{
        width: "100%", height: "100%",
        position: "relative", zIndex: 1,
        animation: `gt-bob ${bobDur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}>

        {/* === TILT (slow 3-axis rotation) === */}
        <div style={{
          width: "100%", height: "100%",
          animation: `gt-tilt ${tiltDur}s ease-in-out infinite`,
          animationDelay: `${delay * 0.4}s`,
        }}>

          {/* === IMAGE with screen blend — dark bg becomes transparent === */}
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
              /*
               * screen blend: screen(dark_page, dark_jpg) ≈ transparent
               * screen(dark_page, bright_glass)          = bright glass
               * This makes the dark JPG background vanish on our #050912 page.
               */
              mixBlendMode: "screen",
              filter: "brightness(2.0) contrast(1.2) saturate(1.5)",
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Individual tokens ────────────────────────────────── */

export function BTCGlass({ size = 380, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay}
    bobDur={5.2} tiltDur={9.8}
    glow="rgba(249,140,20,0.75)" glow2="rgba(240,100,10,0.5)"/>;
}

export function ETHGlass({ size = 360, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/eth.jpg" size={size} delay={delay}
    bobDur={4.8} tiltDur={11.2}
    glow="rgba(80,110,240,0.75)" glow2="rgba(0,200,255,0.5)"/>;
}

export function SOLGlass({ size = 360, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay}
    bobDur={5.6} tiltDur={10.4}
    glow="rgba(160,60,255,0.75)" glow2="rgba(20,241,149,0.4)"/>;
}

export function BNBGlass({ size = 340, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    bobDur={4.6} tiltDur={12.0}
    glow="rgba(240,185,11,0.7)" glow2="rgba(255,80,120,0.4)"/>;
}

export function POLGlass({ size = 320, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay}
    bobDur={5.0} tiltDur={9.2}
    glow="rgba(130,71,229,0.75)" glow2="rgba(200,100,255,0.5)"/>;
}
