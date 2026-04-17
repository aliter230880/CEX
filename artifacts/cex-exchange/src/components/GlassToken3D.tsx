import { useEffect, useRef } from "react";

const CSS = `
@keyframes gt-bob {
  0%,100% { transform: translateY(0px); }
  40%      { transform: translateY(-26px); }
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
  0%,100% { opacity: 0.6; transform: scale(1.0); }
  50%     { opacity: 1.0; transform: scale(1.25); }
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

/** Draw video frames to canvas, removing black/dark background per-pixel */
function useVideoCanvas(src: string, size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const video = document.createElement("video");
    videoRef.current = video;
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    function drawFrame() {
      if (!canvas || !ctx || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(drawFrame);
        return;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(video, 0, 0, size, size);

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
      rafRef.current = requestAnimationFrame(drawFrame);
    }

    video.play().catch(() => {});
    rafRef.current = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.pause();
      video.src = "";
    };
  }, [src, size]);

  return canvasRef;
}

type Wobble = "a" | "b" | "c";

interface TokenProps { size?: number; delay?: number; }
interface VideoProps {
  src: string; size: number; delay: number;
  bobDur: number; wobbleDur: number; wobble: Wobble;
  glowColor: string; glowColor2?: string;
}

function GlassToken({ src, size, delay, bobDur, wobbleDur, wobble, glowColor, glowColor2 }: VideoProps) {
  injectCSS();
  const canvasRef = useVideoCanvas(src, size);

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
        {/* Wobble */}
        <div style={{
          width: "100%", height: "100%",
          animation: `gt-wobble-${wobble} ${wobbleDur}s ease-in-out infinite`,
          animationDelay: `${delay * 0.35}s`,
        }}>
          <canvas
            ref={canvasRef}
            style={{
              width: "100%", height: "100%",
              display: "block",
              filter: "brightness(1.15) saturate(1.3) drop-shadow(0 16px 40px rgba(0,0,0,0.7))",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function BTCGlass({ size = 380, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/btc.webm" size={size} delay={delay}
    bobDur={5.4} wobbleDur={11.0} wobble="a"
    glowColor="rgba(255,130,20,0.85)" glowColor2="rgba(200,60,0,0.5)" />;
}
export function ETHGlass({ size = 360, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/eth.webm" size={size} delay={delay}
    bobDur={4.8} wobbleDur={12.5} wobble="b"
    glowColor="rgba(255,200,40,0.8)" glowColor2="rgba(60,120,255,0.5)" />;
}
export function SOLGlass({ size = 360, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/sol.webm" size={size} delay={delay}
    bobDur={5.8} wobbleDur={10.5} wobble="c"
    glowColor="rgba(140,50,255,0.85)" glowColor2="rgba(20,235,149,0.5)" />;
}
export function BNBGlass({ size = 340, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/bnb.webm" size={size} delay={delay}
    bobDur={4.6} wobbleDur={13.5} wobble="a"
    glowColor="rgba(255,200,10,0.8)" glowColor2="rgba(255,60,150,0.5)" />;
}
export function POLGlass({ size = 320, delay = 0 }: TokenProps) {
  return <GlassToken src="/glass-tokens/pol.webm" size={size} delay={delay}
    bobDur={5.2} wobbleDur={9.5} wobble="b"
    glowColor="rgba(110,55,230,0.85)" glowColor2="rgba(200,80,255,0.55)" />;
}
