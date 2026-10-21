import Link from "next/link";
import { ClipboardCheck, LayoutDashboard, LogOut, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { signOutAdmin } from "@/app/admin/actions";

export function AdminShell({
  children,
  pendingCount,
  section = "overview",
}: {
  children: React.ReactNode;
  pendingCount: number;
  section?: "overview" | "sellers" | "stores" | "products";
}) {
  const navItems = [
    { href: "/admin", label: "Vue d’ensemble", icon: LayoutDashboard, key: "overview" },
    { href: "/admin/vendeurs", label: "Demandes vendeurs", icon: ClipboardCheck, key: "sellers" },
    { href: "/admin/boutiques", label: "Boutiques", icon: Store, key: "stores" },
    { href: "/admin/produits", label: "Catalogue produits", icon: PackageSearch, key: "products" },
  ] as const;
  const pageTitle = navItems.find((item) => item.key === section)?.label ?? "Administration";

  return (
    <div className="min-h-screen bg-[#faf7f6] text-[#241518] lg:flex">
      <aside className="flex shrink-0 flex-col bg-[#241014] px-5 py-5 text-white sm:px-7 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:px-6 lg:py-7">
        <Link href="/admin" aria-label="ORIVFIDE administration" className="w-fit">
          <OrivfideLogo variant="light" />
        </Link>

        <div className="mt-8 hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 lg:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c41230]/20 text-[#ffb7c3]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Espace administrateur</span>
            <span className="mt-0.5 block text-xs text-white/55">Gestion de la marketplace</span>
          </span>
        </div>

        <p className="mb-2 mt-8 hidden px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/45 lg:block">
          Administration
        </p>
        <nav aria-label="Navigation administrateur" className="mt-6 flex gap-2 overflow-x-auto lg:mt-0 lg:flex-col">
          {navItems.map(({ href, label, icon: Icon, key }) => {
            const active = section === key;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-[#c41230] text-white shadow-lg shadow-black/10 hover:bg-[#a90f28]"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                <span>{label}</span>
                {key === "sellers" && pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <p className="mt-5 hidden border-t border-white/10 pt-5 text-xs leading-5 text-white/50 lg:mt-auto lg:block">
          Outils de supervision des vendeurs, boutiques et produits.
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-[4.5rem] items-center justify-between gap-4 border-b border-black/5 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs text-orivfide-muted">ORIVFIDE / Administration</p>
            <p className="mt-1 text-sm font-semibold">{pageTitle}</p>
          </div>
          <form action={signOutAdmin}>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-semibold transition hover:border-orivfide-red/30 hover:bg-[#fbebed] hover:text-orivfide-red">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </form>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
