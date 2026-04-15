import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";

interface AdminAuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  checkAdmin: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAdmin: false,
  isLoading: true,
  checkAdmin: async () => {},
  logout: async () => {},
});

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/admin/me", { credentials: "include" });
      setIsAdmin(res.ok);
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setIsAdmin(false);
  };

  useEffect(() => { checkAdmin(); }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdmin, isLoading, checkAdmin, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation("/admin/login");
    }
  }, [isAdmin, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Verifying admin access...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
};
