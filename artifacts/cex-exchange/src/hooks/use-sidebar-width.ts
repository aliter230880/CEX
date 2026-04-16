import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "atex-sidebar-width";
const DEFAULT = 256;
const MIN = 160;
const MAX = 400;

function load(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v) return Math.max(MIN, Math.min(MAX, Number(v)));
  } catch {}
  return DEFAULT;
}

export function useSidebarWidth() {
  const [width, setWidth] = useState<number>(load);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const next = Math.max(MIN, Math.min(MAX, startW.current + (e.clientX - startX.current)));
      setWidth(next);
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return { width, onMouseDown };
}
