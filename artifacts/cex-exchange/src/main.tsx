import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Subtle click sound via Web Audio API (no external file needed)
let audioCtx: AudioContext | null = null;

function playClickSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const sampleRate = audioCtx.sampleRate;
    const duration = 0.03; // 30ms
    const buffer = audioCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const decay = Math.exp(-i / (data.length * 0.25));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.06;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
  } catch {
    // AudioContext unavailable — silent fallback
  }
}

document.addEventListener("mousedown", (e) => {
  const target = e.target as HTMLElement;
  const interactive = target.closest(
    'button:not([disabled]), [role="tab"], [role="menuitem"], [role="option"], [role="button"]:not([disabled])'
  );
  if (interactive) playClickSound();
});

createRoot(document.getElementById("root")!).render(<App />);
