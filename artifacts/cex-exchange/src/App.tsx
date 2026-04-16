import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import { AdminAuthProvider, AdminProtectedRoute } from "@/lib/admin-auth";
import { usePriceStream } from "@/hooks/use-price-stream";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Trade from "@/pages/trade";
import Wallet from "@/pages/wallet";
import Orders from "@/pages/orders";
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminUserDetail from "@/pages/admin/user-detail";
import AdminAuditLog from "@/pages/admin/audit-log";
import AdminTradingPairs from "@/pages/admin/trading-pairs";
import AdminTokens from "@/pages/admin/tokens";
import AdminFees from "@/pages/admin/fees";
import AdminReferrals from "@/pages/admin/referrals";
import AdminTransactions from "@/pages/admin/transactions";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/users/:id">
        <AdminProtectedRoute>
          <AdminUserDetail />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <AdminProtectedRoute>
          <AdminUsers />
        </AdminProtectedRoute>
      </Route>
      <Route path="/admin/audit-log">
        <AdminProtectedRoute><AdminAuditLog /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/trading-pairs">
        <AdminProtectedRoute><AdminTradingPairs /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/tokens">
        <AdminProtectedRoute><AdminTokens /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/fees">
        <AdminProtectedRoute><AdminFees /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/referrals">
        <AdminProtectedRoute><AdminReferrals /></AdminProtectedRoute>
      </Route>
      <Route path="/admin/transactions">
        <AdminProtectedRoute><AdminTransactions /></AdminProtectedRoute>
      </Route>
      <Route path="/admin">
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      </Route>

      {/* Landing page */}
      <Route path="/" component={Landing} />

      {/* Public / user routes */}
      <Route path="/markets">
        <Layout>
          <Home />
        </Layout>
      </Route>
      <Route path="/trade/:pair">
        <Layout>
          <Trade />
        </Layout>
      </Route>
      <Route path="/wallet">
        <ProtectedRoute>
          <Layout>
            <Wallet />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/orders">
        <ProtectedRoute>
          <Layout>
            <Orders />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function LivePriceStream() {
  usePriceStream();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <LivePriceStream />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AdminAuthProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
