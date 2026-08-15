import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  const host = headers().get("host") ?? "";

  // adminboard.oralyah.com has no "/admin" prefix to disallow (clean URLs like "/orders",
  // "/login") — block the whole subdomain from indexing instead of leaving it wide open.
  if (host === "adminboard.oralyah.com") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
