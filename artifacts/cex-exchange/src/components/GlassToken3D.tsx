import { useEffect, useRef } from "react";

const CSS = `
@keyframes gt-bob {
  0%,100% { transform: translateY(0px); }
  40%      { transform: translateY(-26px); }
}

/* Increased amplitude: ±25deg Y, ±15deg X */
@keyframes gt-wobble-a {
  0%   { transform: perspective(900px) rotateX(12deg)  rotateY(-25deg) rotateZ(-5deg); }
  25%  { transform: perspective(900px) rotateX(-9deg)  rotateY(20deg)  rotateZ(4deg); }
  50%  { transform: perspective(900px) rotateX(15deg)  rotateY(8deg)   rotateZ(-3deg); }
  75%  { transform: perspective(900px) rotateX(-12deg) rotateY(-18deg) rotateZ(5deg); }
  100% { transform: perspective(900px) rotateX(12deg)  rotateY(-25deg) rotateZ(-5deg); }
}
@keyframes gt-wobble-b {
  0%   { transform: perspective(900px) rotateX(-10deg) rotateY(22deg)  rotateZ(4deg); }
  33%  { transform: perspective(900px) rotateX(14deg)  rotateY(-14deg) rotateZ(-5deg); }
  66%  { transform: perspective(900px) rotateX(-16deg) rotateY(6deg)   rotateZ(3deg); }
  100% { transform: perspective(900px) rotateX(-10deg) rotateY(22deg)  rotateZ(4deg); }
}
@keyframes gt-wobble-c {
  0%   { transform: perspective(900px) rotateX(7deg)   rotateY(18deg)  rotateZ(-6deg); }
  40%  { transform: perspective(900px) rotateX(-14deg) rotateY(-10deg) rotateZ(5deg); }
  70%  { transform: perspective(900px) rotateX(11deg)  rotateY(-22deg) rotateZ(-2deg); }
  100% { transform: perspective(900px) rotateX(7deg)   rotateY(18deg)  rotateZ(-6deg); }
}

@keyframes gt-glow-pulse {
  0%,100% { opacity: 0.6; transform: scale(1.0); }
  50%     { opacity: 1.0; transform: scale(1.25); }
}

/* Sheen / iridescent shimmer overlay */
@keyframes gt-sheen {
  0%   { background-position: -200% 50%; }
  100% { background-position: 300% 50%; }
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

/** Remove black/dark background via Canvas pixel processing */
function useTransparentCanvas(src: string, size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
        if (brightness < 18) {
          d[i + 3] = 0;
        } else if (brightness < 50) {
          d[i + 3] = Math.round(((brightness - 18) / 32) * 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
    };
  }, [src, size]);

  return canvasRef;
}

type Wobble = "a" | "b" | "c";

interface TokenProps { size?: number; delay?: number; }
interface ImgProps {
  src: string; size: number; delay: number;
  bobDur: number; wobbleDur: number; wobble: Wobble;
  glowColor: string; glowColor2?: string;
  sheenColors: string; // gradient colors for iridescent sheen
}

function GlassToken({ src, size, delay, bobDur, wobbleDur, wobble, glowColor, glowColor2, sheenColors }: ImgProps) {
  injectCSS();
  const canvasRef = useTransparentCanvas(src, size);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {/* Ambient glow blob */}
      <div aria-hidden style={{
        position: "absolute", inset: "-60%", zIndex: 0, pointerEvents: "none",
        background: glowColor2
          ? `radial-gradient(ellipse 58% 62% at 44% 52%, ${glowColor} 0%, ${glowColor2} 42%, transparent 72%)`
          : `radial-gradient(circle at 50% 50%, ${glowColor} 0%, transparent 68%)`,
        filter: "blur(55px)",
        animation: `gt-glow-pulse ${bobDur * 1.3}s ease-in-out infinite`,
        animationDelay: `${delay * 0.6}s`,
      }} />

      {/* Bob */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        animation: `gt-bob ${bobDur}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}>
        {/* Wobble — higher amplitude */}
        <div style={{
          width: "100%", height: "100%",
          animation: `gt-wobble-${wobble} ${wobbleDur}s ease-in-out infinite`,
          animationDelay: `${delay * 0.35}s`,
          position: "relative",
        }}>
          {/* Canvas with black bg removed */}
          <canvas
            ref={canvasRef}
            style={{
              width: "100%", height: "100%",
              display: "block",
              filter: "brightness(1.15) saturate(1.3) drop-shadow(0 14px 35px rgba(0,0,0,0.7))",
            }}
          />

          {/* Iridescent sheen overlay — slides across the surface */}
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(105deg, transparent 20%, ${sheenColors}, transparent 80%)`,
            backgroundSize: "300% 100%",
            animation: `gt-sheen ${bobDur * 1.8}s ease-in-out infinite`,
            animationDelay: `${delay * 0.5}s`,
            mixBlendMode: "overlay",
            opacity: 0.55,
            pointerEvents: "none",
            borderRadius: "4px",
          }} />

          {/* Specular highlight — small bright reflection */}
          <div aria-hidden style={{
            position: "absolute",
            top: "8%", left: "18%",
            width: "35%", height: "28%",
            background: "radial-gradient(ellipse at 40% 35%, rgba(255,255,255,0.55) 0%, transparent 70%)",
            mixBlendMode: "overlay",
            opacity: 0.7,
            pointerEvents: "none",
            filter: "blur(3px)",
          }} />
        </div>
      </div>
    </div>
  );
}

export function BTCGlass({ size = 190, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/btc.jpg" size={size} delay={delay}
    bobDur={5.4} wobbleDur={11.0} wobble="a"
    glowColor="rgba(255,130,20,0.85)" glowColor2="rgba(200,60,0,0.5)"
    sheenColors="rgba(255,200,100,0.5) 40%, rgba(255,120,50,0.3) 50%, rgba(255,220,150,0.45) 60%"
  />;
}
export function ETHGlass({ size = 180, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/eth.jpg" size={size} delay={delay}
    bobDur={4.8} wobbleDur={12.5} wobble="b"
    glowColor="rgba(255,200,40,0.8)" glowColor2="rgba(60,120,255,0.5)"
    sheenColors="rgba(180,200,255,0.5) 40%, rgba(255,240,180,0.35) 50%, rgba(140,180,255,0.45) 60%"
  />;
}
export function SOLGlass({ size = 180, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/sol.jpg" size={size} delay={delay}
    bobDur={5.8} wobbleDur={10.5} wobble="c"
    glowColor="rgba(140,50,255,0.85)" glowColor2="rgba(20,235,149,0.5)"
    sheenColors="rgba(180,100,255,0.5) 40%, rgba(20,241,149,0.35) 50%, rgba(100,200,255,0.45) 60%"
  />;
}
export function BNBGlass({ size = 170, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/bnb.jpg" size={size} delay={delay}
    bobDur={4.6} wobbleDur={13.5} wobble="a"
    glowColor="rgba(255,200,10,0.8)" glowColor2="rgba(255,60,150,0.5)"
    sheenColors="rgba(255,230,80,0.5) 40%, rgba(255,120,200,0.35) 50%, rgba(255,220,60,0.45) 60%"
  />;
}
export function POLGlass({ size = 160, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/pol.jpg" size={size} delay={delay}
    bobDur={5.2} wobbleDur={9.5} wobble="b"
    glowColor="rgba(110,55,230,0.85)" glowColor2="rgba(200,80,255,0.55)"
    sheenColors="rgba(180,100,255,0.5) 40%, rgba(255,150,255,0.35) 50%, rgba(140,80,230,0.45) 60%"
  />;
}
