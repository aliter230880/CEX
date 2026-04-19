import { useRoute } from "wouter";
import { 
  useGetTicker, 
  useGetOrderBook, 
  useGetRecentTrades, 
  useGetOrders, 
  useGetBalances,
  useCreateOrder,
  getGetTickerQueryKey,
  getGetOrderBookQueryKey,
  getGetRecentTradesQueryKey,
  getGetOrdersQueryKey,
  getGetBalancesQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PriceChart } from "@/components/PriceChart";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";
import { useResizablePanels } from "@/hooks/use-resizable-panels";
import { ResizableDivider } from "@/components/ResizableDivider";

const orderSchema = z.object({
  type: z.enum(["limit", "market"]),
  side: z.enum(["buy", "sell"]),
  price: z.string().optional(),
  quantity: z.string().min(0.00000001, "Quantity required"),
}).superRefine((data, ctx) => {
  if (data.type === "limit" && !data.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Price required for limit orders",
      path: ["price"]
    });
  }
});

export default function Trade() {
  const [, params] = useRoute("/trade/:pair");
  const urlPair = params?.pair || "BTC_USDT";
  // pair for display (BTC/USDT), apiPair for API calls (BTC-USDT)
  const pair = urlPair.replace(/_/g, "/");
  const apiPair = urlPair.replace(/_/g, "-");
  const [baseAsset, quoteAsset] = pair.split("/");

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: ticker } = useGetTicker(apiPair, { query: { queryKey: getGetTickerQueryKey(apiPair), enabled: !!apiPair, refetchInterval: 60_000 } });
  const { data: orderBook } = useGetOrderBook(apiPair, { depth: 20 }, { query: { queryKey: getGetOrderBookQueryKey(apiPair, { depth: 20 }), enabled: !!apiPair, refetchInterval: 3000 } });
  const { data: recentTrades } = useGetRecentTrades(apiPair, { limit: 50 }, { query: { queryKey: getGetRecentTradesQueryKey(apiPair, { limit: 50 }), enabled: !!apiPair, refetchInterval: 3000 } });

  const priceFlash = useFlashOnChange(ticker?.lastPrice);
  const { data: openOrders } = useGetOrders({ pair, status: "open" }, { query: { queryKey: getGetOrdersQueryKey({ pair, status: "open" }), enabled: !!user && !!pair } });
  const { data: balances } = useGetBalances({ query: { queryKey: getGetBalancesQueryKey(), enabled: !!user } });

  const createOrder = useCreateOrder();
  const { widths, onMouseDown } = useResizablePanels();

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { type: "limit", side: "buy", price: "", quantity: "" },
  });

  const watchType = form.watch("type");
  const watchSide = form.watch("side");

  const onSubmit = (data: z.infer<typeof orderSchema>) => {
    createOrder.mutate({ 
      data: {
        pair,
        side: data.side,
        type: data.type,
        price: data.type === 'limit' ? data.price : undefined,
        quantity: data.quantity
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Order submitted" });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
        form.reset({ ...data, quantity: "" });
      },
      onError: (err) => {
        toast({ title: "Order failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const baseBalance = balances?.find(b => b.asset === baseAsset)?.available || "0";
  const quoteBalance = balances?.find(b => b.asset === quoteAsset)?.available || "0";

  const change = Number(ticker?.priceChangePercent || 0);
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col h-full bg-background dark">
      {/* Ticker Header */}
      <div className="flex items-center gap-6 p-4 border-b bg-card">
        <div>
          <h1 className="text-2xl font-bold">{pair}</h1>
          <a href="#" className="text-sm text-primary hover:underline">Market Info</a>
        </div>
        <div className="flex flex-col">
          <span
            className={`text-xl font-bold font-mono px-1 rounded ${isPositive ? 'text-success' : 'text-destructive'} ${
              priceFlash === "up" ? "price-flash-up" : priceFlash === "down" ? "price-flash-down" : ""
            }`}
          >
            {ticker?.lastPrice ? Number(ticker.lastPrice).toLocaleString() : '---'}
          </span>
          <span className="text-sm text-muted-foreground">${ticker?.lastPrice ? Number(ticker.lastPrice).toLocaleString() : '---'}</span>
        </div>
        <div className="flex flex-col hidden sm:flex">
          <span className="text-xs text-muted-foreground">24h Change</span>
          <span className={`text-sm font-mono ${isPositive ? 'text-success' : 'text-destructive'}`}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-col hidden md:flex">
          <span className="text-xs text-muted-foreground">24h High</span>
          <span className="text-sm font-mono">{ticker?.highPrice ? Number(ticker.highPrice).toLocaleString() : '---'}</span>
        </div>
        <div className="flex flex-col hidden md:flex">
          <span className="text-xs text-muted-foreground">24h Low</span>
          <span className="text-sm font-mono">{ticker?.lowPrice ? Number(ticker.lowPrice).toLocaleString() : '---'}</span>
        </div>
        <div className="flex flex-col hidden lg:flex">
          <span className="text-xs text-muted-foreground">24h Vol({baseAsset})</span>
          <span className="text-sm font-mono">{ticker?.volume ? Number(ticker.volume).toLocaleString() : '---'}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left Column: Chart & Orders */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-[50vh] lg:h-[60%] border-b bg-card overflow-hidden">
            <PriceChart apiPair={apiPair} isPositive={isPositive} />
          </div>
          <div className="flex-1 p-4 overflow-auto bg-card">
            <h3 className="font-semibold mb-4">Open Orders</h3>
            {!user ? (
              <div className="text-center py-8 text-muted-foreground">
                Please <a href="/login" className="text-primary hover:underline">login</a> to view your orders.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Filled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</TableCell>
                      <TableCell className="uppercase text-xs">{order.type}</TableCell>
                      <TableCell className={`uppercase text-xs font-bold ${order.side === 'buy' ? 'text-success' : 'text-destructive'}`}>
                        {order.side}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{order.price ? Number(order.price).toLocaleString() : 'Market'}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{Number(order.quantity).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{(Number(order.filled)/Number(order.quantity)*100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {openOrders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-xs text-muted-foreground">
                        No open orders
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <ResizableDivider onMouseDown={onMouseDown("orderBook")} />

        {/* Middle Column: Order Book */}
        <div className="hidden lg:flex flex-col bg-card border-r" style={{ width: widths.orderBook, flexShrink: 0 }}>
          <div className="p-2 border-b font-semibold text-sm">Order Book</div>
          <div className="flex-1 flex flex-col overflow-hidden text-xs font-mono">
            <div className="flex justify-between px-2 py-1 text-muted-foreground">
              <span>Price({quoteAsset})</span>
              <span>Amount({baseAsset})</span>
              <span>Total</span>
            </div>
            
            {/* Asks (Red, reverse order so lowest is near middle) */}
            <div className="flex-1 overflow-hidden flex flex-col-reverse justify-end">
              {orderBook?.asks.slice(0, 15).reverse().map((ask, i) => (
                <div key={`ask-${i}`} className="flex justify-between px-2 py-[2px] hover:bg-muted/50 cursor-pointer">
                  <span className="text-destructive">{Number(ask[0]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span>{Number(ask[1]).toLocaleString()}</span>
                  <span className="text-muted-foreground">{(Number(ask[0])*Number(ask[1])).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>

            <div className="py-2 px-2 border-y flex items-center justify-between bg-muted/20">
              <span
                className={`text-lg font-bold px-1 rounded ${isPositive ? 'text-success' : 'text-destructive'} ${
                  priceFlash === "up" ? "price-flash-up" : priceFlash === "down" ? "price-flash-down" : ""
                }`}
              >
                {ticker?.lastPrice ? Number(ticker.lastPrice).toLocaleString() : '---'}
              </span>
            </div>

            {/* Bids (Green, highest on top) */}
            <div className="flex-1 overflow-hidden">
              {orderBook?.bids.slice(0, 15).map((bid, i) => (
                <div key={`bid-${i}`} className="flex justify-between px-2 py-[2px] hover:bg-muted/50 cursor-pointer">
                  <span className="text-success">{Number(bid[0]).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span>{Number(bid[1]).toLocaleString()}</span>
                  <span className="text-muted-foreground">{(Number(bid[0])*Number(bid[1])).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ResizableDivider onMouseDown={onMouseDown("tradeForm")} />

        {/* Right Column: Order Form & Recent Trades */}
        <div className="hidden lg:flex flex-col bg-card" style={{ width: widths.tradeForm, flexShrink: 0 }}>
          
          {/* Order Form */}
          <div className="p-4 border-b">
            <Tabs defaultValue="limit" onValueChange={(v) => form.setValue("type", v as "limit" | "market")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="limit">Limit</TabsTrigger>
                <TabsTrigger value="market">Market</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-2 mb-4">
              <Button 
                variant={watchSide === 'buy' ? 'default' : 'outline'} 
                className={`flex-1 ${watchSide === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : ''}`}
                onClick={() => form.setValue("side", "buy")}
              >
                Buy
              </Button>
              <Button 
                variant={watchSide === 'sell' ? 'default' : 'outline'} 
                className={`flex-1 ${watchSide === 'sell' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}
                onClick={() => form.setValue("side", "sell")}
              >
                Sell
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mb-4 flex justify-between">
              <span>Available:</span>
              <span className="font-mono font-medium text-foreground">
                {watchSide === 'buy' 
                  ? `${Number(quoteBalance).toLocaleString()} ${quoteAsset}`
                  : `${Number(baseBalance).toLocaleString()} ${baseAsset}`
                }
              </span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                {watchType === 'limit' ? (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex h-10 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                            <span className="flex items-center px-3 border-r border-input bg-muted/50 text-xs font-semibold text-foreground shrink-0 min-w-[52px] justify-center select-none">
                              {quoteAsset}
                            </span>
                            <div className="flex-1 flex items-center px-3 gap-2">
                              <span className="text-xs text-muted-foreground shrink-0 select-none">Price</span>
                              <input
                                className="flex-1 bg-transparent text-right font-mono text-sm outline-none placeholder:text-muted-foreground/50 min-w-0"
                                placeholder="0.00"
                                inputMode="decimal"
                                autoComplete="off"
                                {...field}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="h-10 bg-muted/50 rounded-md flex items-center justify-center text-sm text-muted-foreground">
                    Market Price
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex h-10 rounded-md border border-input bg-background focus-within:ring-1 focus-within:ring-ring overflow-hidden">
                          <span className="flex items-center px-3 border-r border-input bg-muted/50 text-xs font-semibold text-foreground shrink-0 min-w-[52px] justify-center select-none">
                            {baseAsset}
                          </span>
                          <div className="flex-1 flex items-center px-3 gap-2">
                            <span className="text-xs text-muted-foreground shrink-0 select-none">Amount</span>
                            <input
                              className="flex-1 bg-transparent text-right font-mono text-sm outline-none placeholder:text-muted-foreground/50 min-w-0"
                              placeholder="0.00"
                              inputMode="decimal"
                              autoComplete="off"
                              {...field}
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {!user ? (
                  <Button type="button" className="w-full mt-4" variant="secondary" onClick={() => window.location.href='/login'}>
                    Log In to Trade
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className={`w-full mt-4 ${watchSide === 'buy' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`}
                    disabled={createOrder.isPending}
                  >
                    {createOrder.isPending ? "Processing..." : `${watchSide === 'buy' ? 'Buy' : 'Sell'} ${baseAsset}`}
                  </Button>
                )}
              </form>
            </Form>
          </div>

          {/* Recent Trades */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b font-semibold text-sm">Market Trades</div>
            <div className="flex justify-between px-4 py-1 text-xs text-muted-foreground font-mono">
              <span>Price</span>
              <span>Amount</span>
              <span>Time</span>
            </div>
            <div className="flex-1 overflow-auto px-2">
              {recentTrades?.map((trade) => (
                <div key={trade.id} className="flex justify-between py-[2px] text-xs font-mono">
                  <span className={trade.side === 'buy' ? 'text-success' : 'text-destructive'}>
                    {Number(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span>{Number(trade.quantity).toLocaleString()}</span>
                  <span className="text-muted-foreground">{new Date(trade.createdAt).toLocaleTimeString([], { hour12: false })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}