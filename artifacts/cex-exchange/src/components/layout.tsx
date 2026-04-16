import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout, useGetTradingPairs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, History, LogOut, TrendingUp, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, checkAuth } = useAuth();
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const { data: pairs } = useGetTradingPairs();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        checkAuth();
        setLocation("/");
      },
    });
  };

  const NavLinks = () => (
    <>
      <Link href="/markets" className="flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors">
        <TrendingUp className="w-4 h-4" /> Markets
      </Link>
      {user ? (
        <>
          <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors">
            <Wallet className="w-4 h-4" /> Wallet
          </Link>
          <Link href="/orders" className="flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors">
            <History className="w-4 h-4" /> Orders
          </Link>
        </>
      ) : null}
    </>
  );

  const Sidebar = () => (
    <div className="w-64 border-r bg-card flex flex-col hidden md:flex h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Trading Pairs</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pairs?.map((pair) => (
            <Link key={pair.id} href={`/trade/${pair.symbol.replace("/", "_")}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors">
              <span className="font-medium">{pair.symbol}</span>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col dark">
      <header className="h-16 border-b bg-card sticky top-0 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-4 border-b">
                <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
                  <img src="/logo.png" alt="" className="w-7 h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} /> ATEX
                </Link>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <NavLinks />
              </div>
              <div className="p-4 border-t">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Trading Pairs</h2>
                <div className="space-y-1">
                  {pairs?.map((pair) => (
                    <Link key={pair.id} href={`/trade/${pair.symbol.replace("/", "_")}`} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors">
                      <span className="font-medium">{pair.symbol}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} /> ATEX
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          )}
        </div>
      </header>
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}