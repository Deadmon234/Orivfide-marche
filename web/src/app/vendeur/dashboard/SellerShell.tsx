import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  Store,
} from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { signOutSeller } from "@/app/vendeur/actions";
import type { SellerAccount, SellerStore } from "@/lib/seller-api";

const navigation = [
  { href: "/vendeur/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard, key: "overview" },
  { href: "/vendeur/dashboard/produits", label: "Mes produits", icon: Package, key: "products" },
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
  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518] lg:flex">
      <aside className="flex flex-col border-b border-black/5 bg-[#241014] px-5 py-5 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/10 lg:px-6 lg:py-7">
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
        <nav aria-label="Navigation vendeur" className="mt-6 flex gap-2 overflow-x-auto lg:flex-col">
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
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-black/5 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs text-orivfide-muted">Espace vendeur</p>
            <p className="mt-1 text-sm font-semibold">{seller.fullName}</p>
          </div>
          <form action={signOutSeller} className="lg:hidden">
            <button aria-label="Se déconnecter" className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <Link
            href="/accueil"
            className="hidden items-center gap-2 text-sm font-semibold text-orivfide-red transition hover:gap-3 sm:inline-flex"
          >
            Retour au site <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>
        <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </section>
    </main>
  );
}
