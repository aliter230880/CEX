/**
 * 3D Glass Tokens — pure black JPG backgrounds + mix-blend-mode:screen
 *
 * These reference images have a PURE BLACK (#000000) background.
 * screen(#000, anything) = anything → black pixels become INVISIBLE on any background.
 * The glass token shapes float without any background box.
 *
 * NO circular mask — the shape boundary is the glass object itself.
 */

const CSS = `
@keyframes gt-bob {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  30%      { transform: translateY(-24px) rotate(0.5deg); }
  70%      { transform: translateY(-10px) rotate(-0.4deg); }
}
@keyframes gt-wobble-a {
  0%   { transform: perspective(900px) rotateX(8deg)   rotateY(-15deg) rotateZ(-3deg); }
  25%  { transform: perspective(900px) rotateX(-5deg)  rotateY(12deg)  rotateZ(2.5deg); }
  50%  { transform: perspective(900px) rotateX(11deg)  rotateY(5deg)   rotateZ(-2deg); }
  75%  { transform: perspective(900px) rotateX(-8deg)  rotateY(-10deg) rotateZ(3.5deg); }
  100% { transform: perspective(900px) rotateX(8deg)   rotateY(-15deg) rotateZ(-3deg); }
}
@keyframes gt-wobble-b {
  0%   { transform: perspective(900px) rotateX(-7deg)  rotateY(14deg)  rotateZ(2.5deg); }
  33%  { transform: perspective(900px) rotateX(10deg)  rotateY(-8deg)  rotateZ(-3deg); }
  66%  { transform: perspective(900px) rotateX(-12deg) rotateY(4deg)   rotateZ(2deg); }
  100% { transform: perspective(900px) rotateX(-7deg)  rotateY(14deg)  rotateZ(2.5deg); }
}
@keyframes gt-wobble-c {
  0%   { transform: perspective(900px) rotateX(5deg)   rotateY(10deg)  rotateZ(-4deg); }
  40%  { transform: perspective(900px) rotateX(-10deg) rotateY(-6deg)  rotateZ(3.5deg); }
  70%  { transform: perspective(900px) rotateX(8deg)   rotateY(-14deg) rotateZ(-1.5deg); }
  100% { transform: perspective(900px) rotateX(5deg)   rotateY(10deg)  rotateZ(-4deg); }
}
@keyframes gt-glow-pulse {
  0%,100% { opacity: 0.65; transform: scale(1.0); }
  50%     { opacity: 1.00; transform: scale(1.22); }
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

type Wobble = "a" | "b" | "c";

interface Props {
  src: string;
  size: number;
  delay: number;
  bobDur: number;
  wobbleDur: number;
  wobble: Wobble;
  glowColor: string;   // ambient glow behind token (large blob)
  glowColor2?: string;
}

function GlassToken({ src, size, delay, bobDur, wobbleDur, wobble, glowColor, glowColor2 }: Props) {
  injectCSS();

  return (
    <div style={{ width: size, height: size, position: "relative" }}>

      {/* ── Ambient glow blob (separate layer, does NOT interact with screen blend) ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-65%",
          zIndex: 0,
          pointerEvents: "none",
          animation: `gt-glow-pulse ${bobDur * 1.3}s ease-in-out infinite`,
          animationDelay: `${delay * 0.6}s`,
          background: glowColor2
            ? `radial-gradient(ellipse 58% 62% at 44% 52%, ${glowColor} 0%, ${glowColor2} 42%, transparent 72%)`
            : `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 68%)`,
          filter: "blur(55px)",
        }}
      />

      {/* ── Token wrapper: isolated stacking context so img blends with dark page ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          /* isolation:isolate ensures mix-blend-mode on img blends with the page
             (near-black #050912), NOT with the colored glow blob above */
          isolation: "isolate",
          animation: `gt-bob ${bobDur}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            animation: `gt-wobble-${wobble} ${wobbleDur}s ease-in-out infinite`,
            animationDelay: `${delay * 0.35}s`,
          }}
        >
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

              /**
               * THE KEY TRICK:
               * These JPGs have a PURE BLACK (#000) background.
               * screen(#000, X) = X  →  black pixels fully disappear.
               * screen(#000, bright_glass) = bright_glass → glass shows through perfectly.
               * Result: tokens appear to float with NO background rectangle.
               */
              mixBlendMode: "screen",
              filter: "brightness(1.8) contrast(1.05) saturate(1.4)",

              /* Drop shadow for depth */
              WebkitFilter: "brightness(1.8) contrast(1.05) saturate(1.4) drop-shadow(0 20px 50px rgba(0,0,0,0.8))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Public exports ───────────────────────────────────── */

export function BTCGlass({ size = 380, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassToken src="/glass-tokens/btc.jpg" size={size} delay={delay}
      bobDur={5.4} wobbleDur={11.0} wobble="a"
      glowColor="rgba(255,130,20,0.85)" glowColor2="rgba(200,60,0,0.5)"
    />
  );
}

export function ETHGlass({ size = 360, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassToken src="/glass-tokens/eth.jpg" size={size} delay={delay}
      bobDur={4.8} wobbleDur={12.5} wobble="b"
      glowColor="rgba(255,200,40,0.8)" glowColor2="rgba(60,120,255,0.5)"
    />
  );
}

export function SOLGlass({ size = 360, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassToken src="/glass-tokens/sol.jpg" size={size} delay={delay}
      bobDur={5.8} wobbleDur={10.5} wobble="c"
      glowColor="rgba(140,50,255,0.85)" glowColor2="rgba(20,235,149,0.5)"
    />
  );
}

export function BNBGlass({ size = 340, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassToken src="/glass-tokens/bnb.jpg" size={size} delay={delay}
      bobDur={4.6} wobbleDur={13.5} wobble="a"
      glowColor="rgba(255,200,10,0.8)" glowColor2="rgba(255,60,150,0.5)"
    />
  );
}

export function POLGlass({ size = 320, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <GlassToken src="/glass-tokens/pol.jpg" size={size} delay={delay}
      bobDur={5.2} wobbleDur={9.5} wobble="b"
      glowColor="rgba(110,55,230,0.85)" glowColor2="rgba(200,80,255,0.55)"
    />
  );
}
