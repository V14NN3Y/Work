"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Auth is now enforced server-side by middleware.ts on every /admin/* request (real session
// validation via Supabase Auth + the is_admin() RPC) — this layout no longer needs its own
// client-side guard, which previously only checked token *presence* in localStorage, not
// validity, and only after hydration (a flash-of-protected-content window middleware avoids).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Closing the drawer on every route change covers link clicks (already handled via
  // AdminSidebar's onNavigate) as well as back/forward navigation, which wouldn't fire onNavigate.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside className="hidden w-64 flex-shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <AdminSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-foreground px-4 py-3 text-background lg:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Ouvrir le menu"
                className="text-background hover:bg-background/10 hover:text-background"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-72 p-0">
              <SheetTitle className="sr-only">Menu d&apos;administration</SheetTitle>
              <AdminSidebar onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <span className="font-heading font-bold">Administration</span>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
