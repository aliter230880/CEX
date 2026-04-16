import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  CandlestickData,
  LineData,
  Time,
} from "lightweight-charts";
import { useGetKlines } from "@workspace/api-client-react";
import { BarChart2, LineChart as LineChartIcon, ZoomIn, ZoomOut } from "lucide-react";

const INTERVALS = [
  { label: "1m",  value: "1m" },
  { label: "5m",  value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1H",  value: "1h" },
  { label: "4H",  value: "4h" },
  { label: "1D",  value: "1d" },
];

interface Hover {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PriceChartProps {
  apiPair: string;
  isPositive: boolean;
}

export function PriceChart({ apiPair, isPositive }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const candleRef     = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef       = useRef<ISeriesApi<"Line"> | null>(null);

  const [interval,   setIntervalState] = useState("1h");
  const [chartType,  setChartType]     = useState<"candle" | "line">("candle");
  const [hover,      setHover]         = useState<Hover | null>(null);

  const { data: klines } = useGetKlines(
    apiPair,
    { limit: 200, interval },
    { query: { enabled: !!apiPair, refetchInterval: 60_000 } }
  );

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "#1e293b" },
        horzLines: { color: "#1e293b" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#334155" },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // v5 API: addSeries(SeriesType, options)
    const candle = chart.addSeries(CandlestickSeries, {
      upColor:        "#22c55e",
      downColor:      "#ef4444",
      borderUpColor:  "#22c55e",
      borderDownColor:"#ef4444",
      wickUpColor:    "#22c55e",
      wickDownColor:  "#ef4444",
    });

    const line = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      visible: false,
    });

    chartRef.current  = chart;
    candleRef.current = candle;
    lineRef.current   = line;

    // Crosshair → hover OHLC
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) { setHover(null); return; }
      const d = param.seriesData.get(candle) as CandlestickData<Time> | undefined;
      if (!d) { setHover(null); return; }
      const ts = param.time as number;
      setHover({
        time:  new Date(ts * 1000).toLocaleString([], { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      });
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      lineRef.current   = null;
    };
  }, []);

  // Update data when klines arrive
  useEffect(() => {
    if (!klines?.length || !candleRef.current || !lineRef.current) return;

    const sorted = [...klines]
      .filter(k => k.open && k.high && k.low && k.close)
      .sort((a, b) => a.openTime - b.openTime);

    const cdData: CandlestickData[] = sorted.map(k => ({
      time:  Math.floor(k.openTime / 1000) as unknown as Time,
      open:  Number(k.open),
      high:  Number(k.high),
      low:   Number(k.low),
      close: Number(k.close),
    }));

    const lnData: LineData[] = cdData.map(c => ({
      time:  c.time,
      value: c.close,
    }));

    try {
      candleRef.current.setData(cdData);
      lineRef.current.setData(lnData);
      chartRef.current?.timeScale().fitContent();
    } catch { /* stale */ }
  }, [klines]);

  // Toggle series visibility
  useEffect(() => {
    candleRef.current?.applyOptions({ visible: chartType === "candle" });
    lineRef.current?.applyOptions({ visible: chartType === "line" });
  }, [chartType]);

  const zoomIn = useCallback(() => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const range = ts.getVisibleLogicalRange();
    if (!range) { ts.scrollToRealTime(); return; }
    const mid  = (range.from + range.to) / 2;
    const half = (range.to - range.from) / 4;
    ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
  }, []);

  const zoomOut = useCallback(() => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const mid  = (range.from + range.to) / 2;
    const half = (range.to - range.from);
    ts.setVisibleLogicalRange({ from: mid - half, to: mid + half });
  }, []);

  const up = hover ? hover.close >= hover.open : isPositive;
  const col = up ? "text-green-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-[#0f172a] flex-wrap">
        {/* Intervals */}
        <div className="flex gap-0.5 mr-2">
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setIntervalState(iv.value)}
              className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
                interval === iv.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-slate-700 mx-1" />

        {/* Chart type */}
        <button
          onClick={() => setChartType("candle")}
          title="Candlestick"
          className={`p-1 rounded transition-colors ${chartType === "candle" ? "text-blue-400 bg-blue-500/10" : "text-slate-400 hover:text-white"}`}
        >
          <BarChart2 size={14} />
        </button>
        <button
          onClick={() => setChartType("line")}
          title="Line"
          className={`p-1 rounded transition-colors ${chartType === "line" ? "text-blue-400 bg-blue-500/10" : "text-slate-400 hover:text-white"}`}
        >
          <LineChartIcon size={14} />
        </button>

        <div className="w-px h-4 bg-slate-700 mx-1" />

        {/* Zoom */}
        <button onClick={zoomIn}  title="Zoom In"  className="p-1 rounded text-slate-400 hover:text-white transition-colors"><ZoomIn  size={14} /></button>
        <button onClick={zoomOut} title="Zoom Out" className="p-1 rounded text-slate-400 hover:text-white transition-colors"><ZoomOut size={14} /></button>

        {/* OHLC info */}
        {hover && (
          <div className="ml-auto flex gap-3 text-xs font-mono text-slate-400">
            <span>O:<span className={col}>{hover.open.toLocaleString()}</span></span>
            <span>H:<span className={col}>{hover.high.toLocaleString()}</span></span>
            <span>L:<span className={col}>{hover.low.toLocaleString()}</span></span>
            <span>C:<span className={col}>{hover.close.toLocaleString()}</span></span>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
