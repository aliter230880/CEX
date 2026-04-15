import type { Request } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
  }
}

export function requireAuth(req: Request): number | null {
  return req.session?.userId ?? null;
}

export function requireAdmin(req: Request): boolean {
  return req.session?.isAdmin === true;
}
