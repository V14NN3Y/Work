import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import "./globals.css";

// Self-hosted (not next/font/google): this sandbox/deploy environment has flaky outbound
// access to fonts.gstatic.com, and self-hosting also keeps the app free of any third-party
// runtime dependency at startup — consistent with the rest of this project's "autonome" design.
const rubik = localFont({
  src: [
    { path: "./fonts/rubik-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/rubik-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/rubik-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-heading",
  display: "swap",
});

const nunitoSans = localFont({
  src: [
    { path: "./fonts/nunito-sans-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/nunito-sans-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/nunito-sans-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/nunito-sans-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
const SITE_NAME = "ORALYAH";
const SITE_DESCRIPTION = "ORALYAH — boutique en ligne avec paiement à la livraison et géolocalisation.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B4D38",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${rubik.variable} ${nunitoSans.variable}`}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          Aller au contenu
        </a>
        <FavoritesProvider>
          <CartProvider>{children}</CartProvider>
        </FavoritesProvider>
        <Toaster />
      </body>
    </html>
  );
}
