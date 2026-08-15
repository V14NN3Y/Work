"use client";

import { createContext, useContext } from "react";

// "" on adminboard.oralyah.com (clean URLs, e.g. "/orders"), "/admin" everywhere else
// (localhost, Netlify previews, or any host that isn't the dedicated admin subdomain — those
// still disambiguate admin from the storefront via the path prefix on a single hostname).
// Populated once, server-side, in app/admin/layout.tsx via the request's Host header — no
// client-side hostname sniffing, so no hydration mismatch risk.
const AdminBasePathContext = createContext("/admin");

export function AdminBasePathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return <AdminBasePathContext.Provider value={basePath}>{children}</AdminBasePathContext.Provider>;
}

export function useAdminBasePath() {
  return useContext(AdminBasePathContext);
}
