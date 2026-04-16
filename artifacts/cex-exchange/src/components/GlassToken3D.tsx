/**
 * 3D Glass Tokens — uses exact reference images, floating + rotating
 */

const CSS = `
@keyframes gt-bob  { 0%,100%{transform:translateY(0px)}  50%{transform:translateY(-18px)} }
@keyframes gt-spin { from{transform:rotateY(0deg)}        to{transform:rotateY(360deg)} }
@keyframes gt-tilt { 0%,100%{transform:rotateX(8deg) rotateZ(-2deg)} 50%{transform:rotateX(-5deg) rotateZ(2deg)} }
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
      width: size, height: size,
      filter: `drop-shadow(0 20px 60px ${glow}) drop-shadow(0 0 100px ${glow})`,
    }}>
      <div style={{ animation: `gt-bob ${bobDur}s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <div style={{
          perspective: "800px", transformStyle: "preserve-3d",
          animation: `gt-spin ${spinDur}s linear infinite`,
          animationDelay: `${delay * 0.5}s`,
        }}>
          <div style={{
            animation: `gt-tilt ${bobDur * 1.4}s ease-in-out infinite`,
            animationDelay: `${delay * 0.7}s`,
          }}>
            <img
              src={src}
              alt=""
              style={{
                width: size, height: size,
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
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

export function ETHGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/eth.jpg" size={size} delay={delay} spinDur={14} bobDur={5}   glow="rgba(160,200,255,0.45)"/>;
}
export function BTCGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay} spinDur={16} bobDur={4.5} glow="rgba(180,180,255,0.4)"/>;
}
export function BNBGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay} spinDur={18} bobDur={5.5} glow="rgba(200,160,255,0.4)"/>;
}
export function SOLGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay} spinDur={15} bobDur={4.8} glow="rgba(160,140,255,0.38)"/>;
}
export function POLGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay} spinDur={13} bobDur={5.2} glow="rgba(180,150,255,0.42)"/>;
}
