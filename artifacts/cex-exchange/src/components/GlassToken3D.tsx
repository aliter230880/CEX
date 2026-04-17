/**
 * 3D Glass Tokens — exact reference images
 * CSS approach from HTML preview: perspective 1200px, screen blend, strong glow
 */

const CSS = `
@keyframes gt-bob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-28px)} }
@keyframes gt-spin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
@keyframes gt-tilt { 0%,100%{transform:rotateX(12deg) rotateZ(-4deg)} 50%{transform:rotateX(-10deg) rotateZ(4deg)} }
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

function GlassImg({ src, size, delay, spinDur, bobDur, glow }:
  { src: string; size: number; delay: number; spinDur: number; bobDur: number; glow: string }) {
  injectCSS();

  return (
    /* glass-container: screen blend + filter on container, strong perspective */
    <div style={{
      width: size,
      height: size,
      position: "relative",
      mixBlendMode: "screen",
      filter: "brightness(1.4) contrast(1.3) saturate(1.25)",
      perspective: "1200px",
      perspectiveOrigin: "50% 50%",
    }}>
      {/* Glow layer, opacity 0.85 */}
      <div style={{
        position: "absolute",
        inset: "-50%",
        background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 65%)`,
        opacity: 0.85,
        zIndex: -1,
        pointerEvents: "none",
      }} />

      {/* Bob */}
      <div style={{
        width: "100%", height: "100%",
        animation: `gt-bob ${bobDur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformStyle: "preserve-3d",
      }}>
        {/* Spin */}
        <div style={{
          animation: `gt-spin ${spinDur}s linear infinite`,
          animationDelay: `${delay * 0.5}s`,
          transformStyle: "preserve-3d",
        }}>
          {/* Tilt + box-shadow glow */}
          <div style={{
            animation: `gt-tilt ${bobDur * 1.1}s ease-in-out infinite`,
            animationDelay: `${delay * 0.7}s`,
            transformStyle: "preserve-3d",
            filter: `drop-shadow(0 30px 30px rgba(0,0,0,0.6))`,
          }}>
            <img
              src={src}
              alt=""
              style={{
                width: size,
                height: size,
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ETHGlass({ size = 220, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/eth.jpg" size={size} delay={delay}
    spinDur={14} bobDur={4.8} glow="rgba(98,126,234,0.7)"/>;
}
export function BTCGlass({ size = 220, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay}
    spinDur={16} bobDur={4.8} glow="rgba(249,166,36,0.65)"/>;
}
export function BNBGlass({ size = 210, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    spinDur={18} bobDur={4.8} glow="rgba(240,185,11,0.65)"/>;
}
export function SOLGlass({ size = 220, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay}
    spinDur={15} bobDur={4.8} glow="rgba(153,69,255,0.65)"/>;
}
export function POLGlass({ size = 200, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay}
    spinDur={13} bobDur={4.8} glow="rgba(130,71,229,0.65)"/>;
}
