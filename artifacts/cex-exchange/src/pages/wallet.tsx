import { useGetBalances, useDeposit, useWithdraw } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalancesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const depositSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  network: z.string().min(1, "Network is required"),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Must be a valid positive amount"),
});

const withdrawSchema = depositSchema.extend({
  address: z.string().min(10, "Valid address required"),
});

export default function Wallet() {
  const { data: balances } = useGetBalances();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { asset: "USDT", network: "ETH", amount: "" },
  });

  const withdrawForm = useForm<z.infer<typeof withdrawSchema>>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { asset: "USDT", network: "ETH", amount: "", address: "" },
  });

  const onDeposit = (data: z.infer<typeof depositSchema>) => {
    deposit.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Deposit successful", description: `Deposited ${data.amount} ${data.asset}` });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
        depositForm.reset({ ...data, amount: "" });
      },
      onError: (err) => {
        toast({ title: "Deposit failed", description: err.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  const onWithdraw = (data: z.infer<typeof withdrawSchema>) => {
    withdraw.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Withdrawal successful", description: `Withdrew ${data.amount} ${data.asset}` });
        queryClient.invalidateQueries({ queryKey: getGetBalancesQueryKey() });
        withdrawForm.reset({ ...data, amount: "", address: "" });
      },
      onError: (err) => {
        toast({ title: "Withdrawal failed", description: err.message || "Unknown error", variant: "destructive" });
      }
    });
  };

  const totalValue = balances?.reduce((acc, b) => acc + Number(b.available) + Number(b.locked), 0) || 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Wallet</h1>
        <p className="text-muted-foreground">Manage your assets and balances</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated Balance</CardTitle>
          <CardDescription>Total value of all your assets (USDT equivalent approximation)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold font-mono">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Asset Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Locked (In Orders)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances?.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="font-bold">{balance.asset}</TableCell>
                      <TableCell className="text-right font-mono">{Number(balance.available).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{Number(balance.locked).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{(Number(balance.available) + Number(balance.locked)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</TableCell>
                    </TableRow>
                  ))}
                  {balances?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No balances found. Make a deposit to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Transfers</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="deposit">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                </TabsList>
                
                <TabsContent value="deposit" className="space-y-4">
                  <Form {...depositForm}>
                    <form onSubmit={depositForm.handleSubmit(onDeposit)} className="space-y-4">
                      <FormField
                        control={depositForm.control}
                        name="asset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USDT">USDT</SelectItem>
                                <SelectItem value="BTC">BTC</SelectItem>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="POL">POL</SelectItem>
                                <SelectItem value="BNB">BNB</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={depositForm.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Network</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                                <SelectItem value="BSC">BNB Smart Chain (BEP20)</SelectItem>
                                <SelectItem value="POLYGON">Polygon</SelectItem>
                                <SelectItem value="SOL">Solana</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={depositForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={deposit.isPending}>
                        {deposit.isPending ? "Processing..." : "Deposit"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="withdraw" className="space-y-4">
                  <Form {...withdrawForm}>
                    <form onSubmit={withdrawForm.handleSubmit(onWithdraw)} className="space-y-4">
                      <FormField
                        control={withdrawForm.control}
                        name="asset"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Asset</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select asset" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USDT">USDT</SelectItem>
                                <SelectItem value="BTC">BTC</SelectItem>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="POL">POL</SelectItem>
                                <SelectItem value="BNB">BNB</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="network"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Network</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select network" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                                <SelectItem value="BSC">BNB Smart Chain (BEP20)</SelectItem>
                                <SelectItem value="POLYGON">Polygon</SelectItem>
                                <SelectItem value="SOL">Solana</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Withdrawal Address</FormLabel>
                            <FormControl>
                              <Input placeholder="0x..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={withdrawForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={withdraw.isPending}>
                        {withdraw.isPending ? "Processing..." : "Withdraw"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}