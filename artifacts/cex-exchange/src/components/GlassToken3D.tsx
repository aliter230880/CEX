/**
 * 3D Glass Tokens — exact reference images, black bg fully removed via screen blend
 */

const CSS = `
@keyframes gt-bob  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-20px)} }
@keyframes gt-spin { from{transform:rotateY(0deg)} to{transform:rotateY(360deg)} }
@keyframes gt-tilt { 0%,100%{transform:rotateX(7deg) rotateZ(-2deg)} 50%{transform:rotateX(-5deg) rotateZ(2.5deg)} }
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
    /*
     * Outer wrapper: mix-blend-mode: screen on the entire thing.
     * This makes every dark/black pixel transparent against the page bg.
     * The glow radial gradient inside also blends beautifully.
     */
    <div style={{
      width: size,
      height: size,
      position: "relative",
      mixBlendMode: "screen",
    }}>
      {/* Glow layer — blends as screen, adds colored aura around token */}
      <div style={{
        position: "absolute",
        inset: "-20%",
        background: `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* Animated token image */}
      <div style={{ animation: `gt-bob ${bobDur}s ease-in-out infinite`, animationDelay: `${delay}s` }}>
        <div style={{
          perspective: "900px",
          transformStyle: "preserve-3d",
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
                width: size,
                height: size,
                objectFit: "contain",
                display: "block",
                userSelect: "none",
                pointerEvents: "none",
                /* Boost contrast so near-black → true black → transparent via parent screen blend */
                filter: "brightness(1.4) contrast(1.3) saturate(1.15)",
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
    spinDur={14} bobDur={5}   glow="rgba(180,160,255,0.55)"/>;
}
export function BTCGlass({ size = 220, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay}
    spinDur={16} bobDur={4.5} glow="rgba(200,160,255,0.5)"/>;
}
export function BNBGlass({ size = 210, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    spinDur={18} bobDur={5.5} glow="rgba(220,120,255,0.5)"/>;
}
export function SOLGlass({ size = 220, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay}
    spinDur={15} bobDur={4.8} glow="rgba(160,120,255,0.5)"/>;
}
export function POLGlass({ size = 200, delay = 0 }: TokenProps) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay}
    spinDur={13} bobDur={5.2} glow="rgba(180,140,255,0.55)"/>;
}
