import type { Request } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function requireAuth(req: Request): number | null {
  return req.session?.userId ?? null;
}
