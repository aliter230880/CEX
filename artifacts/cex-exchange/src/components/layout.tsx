import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout, useGetTradingPairs } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, History, LogOut, TrendingUp, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebarWidth } from "@/hooks/use-sidebar-width";
import { ResizableDivider } from "@/components/ResizableDivider";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, checkAuth } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { data: pairs } = useGetTradingPairs();
  const { width: sidebarWidth, onMouseDown: onSidebarResize } = useSidebarWidth();

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
      <Link
        href="/markets"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-[#00ff88]"
        style={{ color: location.startsWith("/markets") ? "#00ff88" : "rgba(255,255,255,0.75)" }}
      >
        <TrendingUp className="w-4 h-4" /> Markets
      </Link>
      {user ? (
        <>
          <Link
            href="/wallet"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-[#00ff88]"
            style={{ color: location.startsWith("/wallet") ? "#00ff88" : "rgba(255,255,255,0.75)" }}
          >
            <Wallet className="w-4 h-4" /> Wallet
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5 hover:text-[#00ff88]"
            style={{ color: location.startsWith("/orders") ? "#00ff88" : "rgba(255,255,255,0.75)" }}
          >
            <History className="w-4 h-4" /> Orders
          </Link>
        </>
      ) : null}
    </>
  );

  const Sidebar = () => (
    <>
      <div
        className="flex-col hidden md:flex h-[calc(100vh-4rem)] sticky top-16 flex-shrink-0"
        style={{
          width: sidebarWidth,
          background: "rgba(8,12,24,0.6)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Trading Pairs
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {pairs?.map((pair) => {
              const href = `/trade/${pair.symbol.replace("/", "_")}`;
              const isActive = location === href;
              return (
                <Link
                  key={pair.id}
                  href={href}
                  className="flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 hover:bg-white/5"
                  style={{
                    color: isActive ? "#00ff88" : "rgba(255,255,255,0.7)",
                    background: isActive ? "rgba(0,255,136,0.07)" : "transparent",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span>{pair.symbol}</span>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <ResizableDivider onMouseDown={onSidebarResize} />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col dark" style={{ background: "transparent" }}>
      {/* Glass Header */}
      <header
        className="h-16 sticky top-0 z-50 flex items-center justify-between px-4 atex-glass-header"
      >
        <div className="flex items-center gap-4">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" style={{ color: "rgba(255,255,255,0.7)" }}>
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-0"
              style={{ background: "rgba(8,12,24,0.95)", borderRight: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <Link href="/" className="flex items-center gap-2 text-xl font-bold" style={{ color: "#00ff88" }}>
                  <img src="/logo.png" alt="" className="w-7 h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} /> ATEX
                </Link>
              </div>
              <div className="p-2 flex flex-col gap-1">
                <NavLinks />
              </div>
              <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Trading Pairs
                </h2>
                <div className="space-y-0.5">
                  {pairs?.map((pair) => (
                    <Link
                      key={pair.id}
                      href={`/trade/${pair.symbol.replace("/", "_")}`}
                      className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <span>{pair.symbol}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold no-hover" style={{ color: "#00ff88" }}>
            <img src="/logo.png" alt="" className="w-7 h-7 object-contain" onError={e => (e.currentTarget.style.display = 'none')} /> ATEX
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLinks />
          </nav>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm hidden sm:block" style={{ color: "rgba(255,255,255,0.5)" }}>{user.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="text-sm font-semibold rounded-lg px-4"
                  style={{
                    background: "linear-gradient(135deg, #00ff88, #00cc6a)",
                    color: "#080c18",
                    border: "none",
                    boxShadow: "0 0 16px rgba(0,255,136,0.3)",
                  }}
                >
                  Register
                </Button>
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
