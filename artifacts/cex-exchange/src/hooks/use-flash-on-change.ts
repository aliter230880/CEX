import { useEffect, useRef, useState } from "react";

type FlashDirection = "up" | "down" | null;

export function useFlashOnChange(value: string | number | undefined): FlashDirection {
  const [flash, setFlash] = useState<FlashDirection>(null);
  const prevRef = useRef<string | number | undefined>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value === undefined || prevRef.current === undefined) {
      prevRef.current = value;
      return;
    }

    const prev = Number(prevRef.current);
    const curr = Number(value);

    if (curr !== prev) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setFlash(curr > prev ? "up" : "down");
      timerRef.current = setTimeout(() => setFlash(null), 800);
    }

    prevRef.current = value;
  }, [value]);

  return flash;
}
