import { useCallback, useEffect, useRef, useState } from "react";

interface PanelWidths {
  orderBook: number;
  tradeForm: number;
}

const STORAGE_KEY = "atex-panel-widths";
const DEFAULTS: PanelWidths = { orderBook: 288, tradeForm: 320 };
const MIN = 180;
const MAX_BOOK = 480;
const MAX_FORM = 520;

function load(): PanelWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

function save(w: PanelWidths) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(w)); } catch {}
}

export function useResizablePanels() {
  const [widths, setWidths] = useState<PanelWidths>(load);
  const dragging = useRef<"orderBook" | "tradeForm" | null>(null);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((panel: "orderBook" | "tradeForm") => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = panel;
    startX.current = e.clientX;
    startW.current = widths[panel];
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [widths]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const max = dragging.current === "orderBook" ? MAX_BOOK : MAX_FORM;
      const next = Math.max(MIN, Math.min(max, startW.current + delta));
      setWidths(prev => {
        const updated = { ...prev, [dragging.current!]: next };
        save(updated);
        return updated;
      });
    };
    const onUp = () => {
      dragging.current = null;
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

  return { widths, onMouseDown };
}
