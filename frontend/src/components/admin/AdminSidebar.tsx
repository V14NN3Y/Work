"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LogOut, Package, Settings, Star, Tags, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/admin/products", label: "Catalogue", icon: Package },
  { href: "/admin/categories", label: "Catégories", icon: Tags },
  { href: "/admin/orders", label: "Commandes", icon: ClipboardList },
  { href: "/admin/reviews", label: "Avis", icon: Star },
  { href: "/admin/promo-codes", label: "Codes promo", icon: Ticket },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation so middleware re-evaluates with the now-cleared session cookie.
    window.location.href = "/admin/login";
  }

  return (
    <div className="flex h-full flex-col bg-foreground text-background">
      <div className="px-4 py-5">
        <span className="font-heading text-lg font-bold">Administration</span>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-background/15 text-background"
                  : "text-background/70 hover:bg-background/10 hover:text-background"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-background/10 p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-background/70 transition-colors hover:bg-background/10 hover:text-background"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
