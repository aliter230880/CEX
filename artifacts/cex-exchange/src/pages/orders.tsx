import { useGetOrders, useCancelOrder, getGetOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Orders() {
  const { data: orders } = useGetOrders();
  const cancelOrder = useCancelOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCancel = (orderId: number) => {
    cancelOrder.mutate({ id: orderId }, {
      onSuccess: () => {
        toast({ title: "Order cancelled" });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Failed to cancel order", description: err.message, variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Open</Badge>;
      case "partial": return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Partial</Badge>;
      case "filled": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Filled</Badge>;
      case "cancelled": return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Order History</h1>
        <p className="text-muted-foreground">View your past and current orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Filled</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-bold">{order.pair}</TableCell>
                  <TableCell className="uppercase">{order.type}</TableCell>
                  <TableCell className={`uppercase font-bold ${order.side === 'buy' ? 'text-success' : 'text-destructive'}`}>
                    {order.side}
                  </TableCell>
                  <TableCell className="text-right font-mono">{order.price ? Number(order.price).toLocaleString() : 'Market'}</TableCell>
                  <TableCell className="text-right font-mono">{Number(order.quantity).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{Number(order.filled).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{Number(order.total).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    {(order.status === 'open' || order.status === 'partial') && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(order.id)} disabled={cancelOrder.isPending}>
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {orders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No orders found.
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