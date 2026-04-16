import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAllTickersQueryKey,
  getGetTickerQueryKey,
  getGetMarketSummaryQueryKey,
  getGetOrderBookQueryKey,
} from "@workspace/api-client-react";

export function usePriceStream() {
  const queryClient = useQueryClient();
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      const es = new EventSource("/api/market/stream");
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            payload: unknown;
          };

          if (msg.type === "tickers" && Array.isArray(msg.payload)) {
            const tickers = msg.payload as Array<{ pair: string } & Record<string, unknown>>;

            queryClient.setQueryData(getGetAllTickersQueryKey(), tickers);

            for (const ticker of tickers) {
              const dashPair = ticker.pair.replace("/", "-");
              const underscorePair = ticker.pair.replace("/", "_");

              queryClient.setQueryData(getGetTickerQueryKey(dashPair), ticker);
              queryClient.setQueryData(getGetTickerQueryKey(underscorePair), ticker);

              queryClient.invalidateQueries({
                queryKey: getGetOrderBookQueryKey(dashPair),
                refetchType: "active",
              });
            }

            queryClient.invalidateQueries({
              queryKey: getGetMarketSummaryQueryKey(),
              refetchType: "active",
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!destroyed) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
