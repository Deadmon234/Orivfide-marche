"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings2,
  Store,
  X,
} from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { signOutSeller } from "@/app/vendeur/actions";
import type { SellerAccount, SellerStore } from "@/lib/seller-api";

const navigation = [
  { href: "/vendeur/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard, key: "overview" },
  { href: "/vendeur/dashboard/produits", label: "Mes produits", icon: Package, key: "products" },
  { href: "/vendeur/dashboard/commandes", label: "Commandes", icon: Package, key: "orders" },
  { href: "/vendeur/dashboard/stock", label: "Stock", icon: Package, key: "inventory" },
  { href: "/vendeur/dashboard/boutique", label: "Ma boutique", icon: Settings2, key: "store" },
] as const;

export function SellerShell({
  seller,
  store,
  activePage,
  children,
}: {
  seller: SellerAccount;
  store: SellerStore;
  activePage: typeof navigation[number]["key"];
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518] lg:flex">
      <aside className="hidden flex-col border-b border-black/5 bg-[#241014] px-5 py-5 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-6 lg:py-7">
        <Link href="/" aria-label="ORIVFIDE" className="flex flex-col items-start gap-1">
          <OrivfideLogo variant="light" />
          <span className="pl-12 text-xs text-white/55">Espace vendeur</span>
        </Link>
        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Store className="h-5 w-5 text-white/80" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{store.name}</span>
            <span className="mt-0.5 block text-xs text-white/55">Boutique approuvée</span>
          </span>
        </div>
        <nav aria-label="Navigation vendeur" className="mt-6 flex flex-col gap-2">
          {navigation.map(({ href, label, icon: Icon, key }) => (
            <Link
              key={key}
              href={href}
              aria-current={activePage === key ? "page" : undefined}
              className={`seller-nav-item${activePage === key ? " seller-nav-item-active" : ""}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block">
          <p className="truncate text-xs text-white/60">{seller.email}</p>
          <form action={signOutSeller}>
            <button className="mt-4 inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
            </button>
          </form>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-50 border-b border-black/5 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="min-w-0">
              <p className="truncate text-xs text-orivfide-muted">Espace vendeur · {store.name}</p>
              <p className="mt-1 truncate text-sm font-semibold">{seller.fullName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/accueil"
                className="hidden items-center gap-2 text-sm font-semibold text-orivfide-red transition hover:gap-3 sm:inline-flex"
              >
                Retour au site <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <form action={signOutSeller} className="lg:hidden">
                <button
                  type="submit"
                  aria-label="Se déconnecter"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-[#514548] transition hover:border-orivfide-red hover:text-orivfide-red"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-orivfide-red transition hover:border-orivfide-red hover:bg-[#fff7f7] lg:hidden"
                aria-label={menuOpen ? "Fermer le menu vendeur" : "Ouvrir le menu vendeur"}
                aria-expanded={menuOpen}
                aria-controls="seller-mobile-navigation"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <nav
            aria-label="Accès rapide vendeur"
            className="seller-mobile-quick-nav lg:hidden"
          >
            {navigation.map(({ href, label, icon: Icon, key }) => (
              <Link
                key={key}
                href={href}
                aria-current={activePage === key ? "page" : undefined}
                onClick={closeMenu}
                className={`seller-mobile-quick-link${activePage === key ? " seller-mobile-quick-link-active" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{key === "overview" ? "Accueil" : key === "products" ? "Produits" : label}</span>
              </Link>
            ))}
          </nav>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Fermer le menu vendeur"
                tabIndex={-1}
                className="fixed inset-x-0 bottom-0 top-28 z-40 bg-[#241014]/45 backdrop-blur-[2px] lg:hidden"
                onClick={closeMenu}
              />
              <nav
                id="seller-mobile-navigation"
                aria-label="Navigation vendeur"
                className="absolute left-3 right-3 top-[calc(100%+0.5rem)] z-50 grid gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_20px_50px_rgba(36,16,20,0.2)] sm:left-auto sm:right-8 sm:w-80 lg:hidden"
              >
                <div className="border-b border-black/5 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orivfide-red">
                    Espace vendeur
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold">{store.name}</p>
                </div>
                <div className="grid gap-1">
                  {navigation.map(({ href, label, icon: Icon, key }) => (
                    <Link
                      key={key}
                      href={href}
                      aria-current={activePage === key ? "page" : undefined}
                      onClick={closeMenu}
                      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                        activePage === key
                          ? "bg-[#fbebed] text-orivfide-red"
                          : "text-[#514548] hover:bg-[#faf7f6]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                      {activePage === key && (
                        <span className="ml-auto text-xs font-medium">Page actuelle</span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/accueil"
                  onClick={closeMenu}
                  className="flex min-h-11 items-center justify-between border-t border-black/5 pt-3 text-sm font-semibold text-orivfide-red"
                >
                  Retour au site <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </nav>
            </>
          )}
        </header>
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </section>
    </main>
  );
}
