import { useGetMarketSummary, useGetAllTickers, getGetMarketSummaryQueryKey, getGetAllTickersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, TrendingDown, Activity, BarChart2 } from "lucide-react";
import { useState } from "react";
import { useFlashOnChange } from "@/hooks/use-flash-on-change";

function FlashPriceCell({ value }: { value: string | undefined }) {
  const flash = useFlashOnChange(value);
  return (
    <TableCell
      className={`text-right font-mono transition-colors rounded ${
        flash === "up" ? "price-flash-up" : flash === "down" ? "price-flash-down" : ""
      }`}
    >
      ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
    </TableCell>
  );
}

function FlashChangeCell({ value }: { value: string | undefined }) {
  const flash = useFlashOnChange(value);
  const change = Number(value);
  const isPositive = change >= 0;
  return (
    <TableCell
      className={`text-right font-mono rounded ${isPositive ? "text-success" : "text-destructive"} ${
        flash === "up" ? "price-flash-up" : flash === "down" ? "price-flash-down" : ""
      }`}
    >
      {isPositive ? "+" : ""}
      {change.toFixed(2)}%
    </TableCell>
  );
}

export default function Home() {
  const { data: summary } = useGetMarketSummary({
    query: { queryKey: getGetMarketSummaryQueryKey(), refetchInterval: 60_000 },
  });
  const { data: tickers } = useGetAllTickers({
    query: { queryKey: getGetAllTickersQueryKey(), refetchInterval: 60_000 },
  });
  const [search, setSearch] = useState("");

  const filteredTickers = tickers?.filter(t => t.pair.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Markets Overview</h1>
        <p className="text-muted-foreground">View all markets and trading pairs on ATEX</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Number(summary?.totalVolume24h || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pairs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activePairs || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Gainer</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.topGainer?.pair || "-"}</div>
            <p className="text-xs text-success">
              +{Number(summary?.topGainer?.priceChangePercent || 0).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Loser</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.topLoser?.pair || "-"}</div>
            <p className="text-xs text-destructive">
              {Number(summary?.topLoser?.priceChangePercent || 0).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Markets</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Last Price</TableHead>
                <TableHead className="text-right">24h Change</TableHead>
                <TableHead className="text-right">24h High</TableHead>
                <TableHead className="text-right">24h Low</TableHead>
                <TableHead className="text-right">24h Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickers.map((ticker) => (
                <TableRow key={ticker.pair} className="group">
                  <TableCell>
                    <Link href={`/trade/${ticker.pair.replace("/", "_")}`} className="font-bold hover:text-primary transition-colors">
                      {ticker.pair}
                    </Link>
                  </TableCell>
                  <FlashPriceCell value={ticker.lastPrice} />
                  <FlashChangeCell value={ticker.priceChangePercent} />
                  <TableCell className="text-right font-mono">
                    ${Number(ticker.highPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    ${Number(ticker.lowPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(ticker.volume).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTickers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No markets found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
