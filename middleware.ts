import { proxy, config as proxyConfig } from "./proxy";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware entry point.
 * Delegates to proxy.ts which handles session refresh, route protection,
 * and admin access control.
 */
export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = proxyConfig;
