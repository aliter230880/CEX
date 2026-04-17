/**
 * 3D Glass Tokens — reference JPG images with edge-fading mask
 * Radial mask hides the dark rectangle corners of JPGs
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
    <div style={{
      width: size,
      height: size,
      position: "relative",
    }}>
      {/* Colored glow behind the token */}
      <div style={{
        position: "absolute",
        inset: "-35%",
        background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 65%)`,
        opacity: 0.9,
        zIndex: 0,
        pointerEvents: "none",
        filter: "blur(8px)",
      }} />

      {/* Bob animation wrapper */}
      <div style={{
        width: "100%", height: "100%",
        position: "relative",
        zIndex: 1,
        animation: `gt-bob ${bobDur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        transformStyle: "preserve-3d",
      }}>
        {/* Spin */}
        <div style={{
          width: "100%", height: "100%",
          animation: `gt-spin ${spinDur}s linear infinite`,
          animationDelay: `${delay * 0.5}s`,
          transformStyle: "preserve-3d",
        }}>
          {/* Tilt */}
          <div style={{
            width: "100%", height: "100%",
            animation: `gt-tilt ${bobDur * 1.1}s ease-in-out infinite`,
            animationDelay: `${delay * 0.7}s`,
            transformStyle: "preserve-3d",
          }}>
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
                /* Fade out the rectangular dark edges */
                WebkitMaskImage: "radial-gradient(ellipse 78% 78% at 50% 50%, black 45%, transparent 75%)",
                maskImage: "radial-gradient(ellipse 78% 78% at 50% 50%, black 45%, transparent 75%)",
                /* Boost colors */
                filter: "brightness(1.5) contrast(1.25) saturate(1.4) drop-shadow(0 20px 40px rgba(0,0,0,0.7))",
                mixBlendMode: "screen",
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ETHGlass({ size = 340, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/eth.jpg" size={size} delay={delay}
    spinDur={14} bobDur={4.8} glow="rgba(98,126,234,0.75)"/>;
}
export function BTCGlass({ size = 380, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay}
    spinDur={16} bobDur={4.8} glow="rgba(249,166,36,0.7)"/>;
}
export function BNBGlass({ size = 330, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    spinDur={18} bobDur={4.8} glow="rgba(240,185,11,0.7)"/>;
}
export function SOLGlass({ size = 360, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay}
    spinDur={15} bobDur={4.8} glow="rgba(153,69,255,0.7)"/>;
}
export function POLGlass({ size = 320, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay}
    spinDur={13} bobDur={4.8} glow="rgba(130,71,229,0.7)"/>;
}
