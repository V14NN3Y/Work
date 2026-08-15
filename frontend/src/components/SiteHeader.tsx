"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Heart, Package, Search, ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";

const ICON_BUTTON =
  "relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 sm:h-12 sm:w-12";

const BADGE =
  "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-cta-foreground";

export default function SiteHeader() {
  const { itemCount } = useCart();
  const { favoriteIds } = useFavorites();
  // Mobile only: the search field replaces the logo/icons row when open (there isn't room
  // for both on a narrow screen). From `sm` up the search bar is always shown inline instead,
  // regardless of this state — see the `sm:flex`/`sm:hidden` overrides below.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  return (
    <header className="sticky top-0 z-10 bg-primary text-primary-foreground shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:px-6">
        <Link href="/" className={cn("order-1 flex min-w-0 items-center gap-1.5", searchOpen && "hidden sm:flex")}>
          <Image src="/logo-emblem.png" alt="" width={56} height={56} className="h-9 w-auto flex-shrink-0 sm:h-14" priority />
          <span className="truncate font-heading text-base font-bold tracking-wide text-[#E8C275] sm:text-2xl">
            ORALYAH
          </span>
        </Link>

        <form
          action="/"
          method="GET"
          className={cn(
            "order-3 items-center gap-2 sm:order-2 sm:flex sm:w-auto sm:flex-1",
            searchOpen ? "flex w-full" : "hidden sm:flex"
          )}
        >
          <label htmlFor="site-search" className="sr-only">
            Rechercher un produit
          </label>
          <div className="relative flex-1 sm:mx-auto sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <input
              ref={searchInputRef}
              id="site-search"
              type="search"
              name="q"
              placeholder="Rechercher…"
              className="h-11 w-full rounded-full border-0 bg-white pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#E8C275]"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Fermer la recherche"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white sm:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </form>

        <div
          className={cn(
            "order-2 flex-shrink-0 items-center gap-1.5 sm:order-3 sm:flex sm:gap-2",
            searchOpen ? "hidden sm:flex" : "flex"
          )}
        >
          <button type="button" onClick={() => setSearchOpen(true)} aria-label="Rechercher" className={cn(ICON_BUTTON, "sm:hidden")}>
            <Search className="h-4 w-4" />
          </button>
          <Link href="/suivi-commande" aria-label="Mes commandes" className={ICON_BUTTON}>
            <Package className="h-4 w-4 sm:h-5 sm:w-5" />
          </Link>
          <Link href="/favoris" aria-label="Favoris" className={ICON_BUTTON}>
            <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
            {favoriteIds.length > 0 && <span className={BADGE}>{favoriteIds.length}</span>}
          </Link>
          <Link href="/cart" aria-label="Panier" className={ICON_BUTTON}>
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            {itemCount > 0 && <span className={BADGE}>{itemCount}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
