"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LogOut, Package, Settings, Star, Tags, Ticket } from "lucide-react";
import { useAdminBasePath } from "@/components/admin/AdminBasePathContext";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { path: "/products", label: "Catalogue", icon: Package },
  { path: "/categories", label: "Catégories", icon: Tags },
  { path: "/orders", label: "Commandes", icon: ClipboardList },
  { path: "/reviews", label: "Avis", icon: Star },
  { path: "/promo-codes", label: "Codes promo", icon: Ticket },
  { path: "/settings", label: "Paramètres", icon: Settings },
];

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export default function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const basePath = useAdminBasePath();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full navigation so middleware re-evaluates with the now-cleared session cookie.
    window.location.href = `${basePath}/login`;
  }

  return (
    <div className="flex h-full flex-col bg-foreground text-background">
      <div className="px-4 py-5">
        <span className="font-heading text-lg font-bold">Administration</span>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const href = `${basePath}${item.path}`;
          const active = pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={href}
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
