/**
 * 3D Glass Tokens — volumetric float effect
 * Key insight: glow is rendered in a SEPARATE layer (outside token's stacking context)
 * so mix-blend-mode:screen on img blends only with the very dark page (#050912),
 * making dark JPG pixels effectively invisible.
 */

const CSS = `
@keyframes gt-bob {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-26px); }
}
@keyframes gt-wobble-a {
  0%   { transform: perspective(900px) rotateX(10deg)  rotateY(-18deg) rotateZ(-4deg) scale(1.00); }
  20%  { transform: perspective(900px) rotateX(-6deg)  rotateY(14deg)  rotateZ(3deg)  scale(1.03); }
  40%  { transform: perspective(900px) rotateX(14deg)  rotateY(6deg)   rotateZ(-2deg) scale(0.97); }
  60%  { transform: perspective(900px) rotateX(-10deg) rotateY(-12deg) rotateZ(5deg)  scale(1.02); }
  80%  { transform: perspective(900px) rotateX(6deg)   rotateY(18deg)  rotateZ(-3deg) scale(0.98); }
  100% { transform: perspective(900px) rotateX(10deg)  rotateY(-18deg) rotateZ(-4deg) scale(1.00); }
}
@keyframes gt-wobble-b {
  0%   { transform: perspective(900px) rotateX(-8deg)  rotateY(16deg)  rotateZ(3deg)  scale(1.02); }
  25%  { transform: perspective(900px) rotateX(12deg)  rotateY(-10deg) rotateZ(-4deg) scale(0.97); }
  50%  { transform: perspective(900px) rotateX(-14deg) rotateY(6deg)   rotateZ(2deg)  scale(1.04); }
  75%  { transform: perspective(900px) rotateX(8deg)   rotateY(-16deg) rotateZ(-3deg) scale(0.98); }
  100% { transform: perspective(900px) rotateX(-8deg)  rotateY(16deg)  rotateZ(3deg)  scale(1.02); }
}
@keyframes gt-wobble-c {
  0%   { transform: perspective(900px) rotateX(6deg)   rotateY(12deg)  rotateZ(-5deg) scale(1.01); }
  33%  { transform: perspective(900px) rotateX(-12deg) rotateY(-8deg)  rotateZ(4deg)  scale(0.96); }
  66%  { transform: perspective(900px) rotateX(10deg)  rotateY(-16deg) rotateZ(-2deg) scale(1.03); }
  100% { transform: perspective(900px) rotateX(6deg)   rotateY(12deg)  rotateZ(-5deg) scale(1.01); }
}
@keyframes gt-glow-pulse {
  0%,100% { opacity: .65; transform: scale(1); }
  50%     { opacity: 1.0; transform: scale(1.18); }
}
`;

let cssInjected = false;
function injectCSS() {
  if (cssInjected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.textContent = CSS;
  document.head.appendChild(s);
  cssInjected = true;
}

type WobbleVariant = "a" | "b" | "c";

interface GlassImgProps {
  src: string; size: number; delay: number;
  bobDur: number; wobbleDur: number; wobble: WobbleVariant;
  glow: string; glow2?: string;
}

function GlassImg({ src, size, delay, bobDur, wobbleDur, wobble, glow, glow2 }: GlassImgProps) {
  injectCSS();
  const wobbleAnim = `gt-wobble-${wobble}`;

  return (
    /**
     * Outer div — ONLY position/size. No background, no blend mode.
     * Glow and token are siblings so they do NOT form a stacking context
     * that would interfere with the img's mix-blend-mode.
     */
    <div style={{ width: size, height: size, position: "relative" }}>

      {/* ── GLOW: big soft spotlight, behind token ─────────── */}
      {/* z-index:0 — behind the token img */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          /* Extend well beyond bounds so glow bleeds out large */
          inset: "-70%",
          zIndex: 0,
          pointerEvents: "none",
          animation: `gt-glow-pulse ${bobDur * 1.2}s ease-in-out infinite`,
          animationDelay: `${delay * 0.5}s`,
        }}
      >
        <div style={{
          width: "100%", height: "100%",
          background: glow2
            ? `radial-gradient(ellipse 55% 60% at 45% 50%, ${glow} 0%, ${glow2} 40%, transparent 72%)`
            : `radial-gradient(circle at 50% 50%, ${glow} 0%, transparent 68%)`,
          filter: "blur(48px)",
        }} />
      </div>

      {/* ── TOKEN: bob → wobble → img (screen blend) ────────── */}
      {/*
       * isolation: isolate creates a new stacking context.
       * Inside it, mix-blend-mode on img blends with the token's own
       * (transparent/dark) background — NOT with the colored glow.
       * That means: dark JPG areas screen with near-black = invisible.
       */}
      <div
        style={{
          position: "absolute", inset: 0,
          zIndex: 1,
          isolation: "isolate",          /* ← key: separate stacking ctx */
          animation: `gt-bob ${bobDur}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <div style={{
          width: "100%", height: "100%",
          animation: `${wobbleAnim} ${wobbleDur}s ease-in-out infinite`,
          animationDelay: `${delay * 0.3}s`,
        }}>
          <img
            src={src}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
              /*
               * screen(#050912 page, dark JPG bg) ≈ very dark = invisible
               * screen(#050912 page, bright glass) = bright colored pixel
               */
              mixBlendMode: "screen",
              filter: "brightness(2.6) contrast(1.1) saturate(1.7)",
              /* Soften rectangular corners */
              WebkitMaskImage:
                "radial-gradient(ellipse 94% 94% at 50% 50%, black 52%, rgba(0,0,0,.85) 66%, transparent 83%)",
              maskImage:
                "radial-gradient(ellipse 94% 94% at 50% 50%, black 52%, rgba(0,0,0,.85) 66%, transparent 83%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Exported tokens ─────────────────────────────────── */

export function BTCGlass({ size = 380, delay = 0 }: { size?: number; delay?: number }) {
  return <GlassImg src="/glass-tokens/btc.jpg" size={size} delay={delay}
    bobDur={5.4} wobbleDur={10.5} wobble="a"
    glow="rgba(255,140,20,0.85)" glow2="rgba(220,70,0,0.55)"/>;
}

export function ETHGlass({ size = 360, delay = 0 }: { size?: number; delay?: number }) {
  return <GlassImg src="/glass-tokens/eth.jpg" size={size} delay={delay}
    bobDur={4.8} wobbleDur={12.0} wobble="b"
    glow="rgba(255,200,40,0.75)" glow2="rgba(60,100,240,0.5)"/>;
}

export function SOLGlass({ size = 360, delay = 0 }: { size?: number; delay?: number }) {
  return <GlassImg src="/glass-tokens/sol.jpg" size={size} delay={delay}
    bobDur={5.8} wobbleDur={11.0} wobble="c"
    glow="rgba(155,55,255,0.85)" glow2="rgba(20,241,149,0.5)"/>;
}

export function BNBGlass({ size = 340, delay = 0 }: { size?: number; delay?: number }) {
  return <GlassImg src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    bobDur={4.6} wobbleDur={13.0} wobble="a"
    glow="rgba(255,200,10,0.8)" glow2="rgba(255,60,140,0.5)"/>;
}

export function POLGlass({ size = 320, delay = 0 }: { size?: number; delay?: number }) {
  return <GlassImg src="/glass-tokens/pol.jpg" size={size} delay={delay}
    bobDur={5.2} wobbleDur={9.8} wobble="b"
    glow="rgba(120,60,230,0.85)" glow2="rgba(200,80,255,0.55)"/>;
}
