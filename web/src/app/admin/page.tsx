import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowRight, CircleAlert, Package, ShieldCheck, Store, Users } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { SellerApiError, getAdminOverview } from "@/lib/seller-api";

export const metadata = {
  title: "Administration | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminPage() {
  await connection();
  let overview;
  try {
    ({ overview } = await getAdminOverview());
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/admin/connexion");
    throw error;
  }

  const stats = [
    { label: "Vendeurs actifs", value: overview.activeSellers, icon: Users, tone: "bg-emerald-50 text-emerald-800" },
    { label: "Boutiques publiques", value: overview.publicStores, icon: Store, tone: "bg-[#fbebed] text-orivfide-red" },
    { label: "Produits au catalogue", value: overview.totalProducts, icon: Package, tone: "bg-indigo-50 text-indigo-800" },
    { label: "Produits visibles", value: overview.activeProducts, icon: ShieldCheck, tone: "bg-sky-50 text-sky-800" },
  ];

  return (
    <AdminShell pendingCount={overview.pendingSellers}>
      <div className="space-y-8">
        <section className="rounded-3xl bg-gradient-to-br from-[#241014] via-[#42131d] to-[#8f1027] p-6 text-white shadow-lg sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Centre de pilotage</p>
          <div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-serif text-3xl font-bold sm:text-4xl">Vue d’ensemble</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
                Suivez les vendeurs, les boutiques et les produits de la marketplace depuis un espace centralisé.
              </p>
            </div>
            <Link href="/admin/vendeurs" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#42131d] transition hover:bg-[#fbebed]">
              Traiter les demandes
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
              {overview.pendingSellers > 0 && <span className="rounded-full bg-[#fbebed] px-2 py-0.5 text-xs">{overview.pendingSellers}</span>}
            </Link>
          </div>
        </section>

        {overview.pendingSellers > 0 && (
          <Link href="/admin/vendeurs" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 transition hover:bg-amber-100">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{overview.pendingSellers} demande(s) attendent une décision</span>
              <span className="mt-1 block text-sm">Examinez les informations et approuvez ou refusez chaque boutique.</span>
            </span>
          </Link>
        )}

        <section aria-label="Indicateurs de la plateforme" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-5 text-sm text-orivfide-muted">{label}</p>
              <p className="mt-1 font-serif text-3xl font-bold tabular-nums">{value.toLocaleString("fr-FR")}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold">Suivi des vendeurs</h2>
                <p className="mt-1 text-sm text-orivfide-muted">État des inscriptions et des décisions.</p>
              </div>
              <Users className="h-5 w-5 text-orivfide-red" aria-hidden="true" />
            </div>
            <dl className="mt-5 space-y-3">
              <div className="flex justify-between border-b border-black/5 pb-3 text-sm"><dt>En attente</dt><dd className="font-semibold">{overview.pendingSellers}</dd></div>
              <div className="flex justify-between border-b border-black/5 pb-3 text-sm"><dt>Comptes actifs</dt><dd className="font-semibold">{overview.activeSellers}</dd></div>
              <div className="flex justify-between text-sm"><dt>Refusés / à réexaminer</dt><dd className="font-semibold">{overview.rejectedSellers}</dd></div>
            </dl>
            <Link href="/admin/vendeurs" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red hover:underline">
              Ouvrir les demandes <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold">Modération du catalogue</h2>
                <p className="mt-1 text-sm text-orivfide-muted">Contrôlez la visibilité des fiches produit publiques.</p>
              </div>
              <Package className="h-5 w-5 text-orivfide-red" aria-hidden="true" />
            </div>
            <dl className="mt-5 space-y-3">
              <div className="flex justify-between border-b border-black/5 pb-3 text-sm"><dt>Produits visibles</dt><dd className="font-semibold">{overview.activeProducts}</dd></div>
              <div className="flex justify-between text-sm"><dt>Produits masqués</dt><dd className="font-semibold">{overview.hiddenProducts}</dd></div>
            </dl>
            <Link href="/admin/produits" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red hover:underline">
              Gérer le catalogue <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-bold">Visibilité des boutiques</h2>
                <p className="mt-1 text-sm text-orivfide-muted">Consultez les vitrines et leur publication.</p>
              </div>
              <Store className="h-5 w-5 text-orivfide-red" aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm text-orivfide-muted">Boutiques actuellement publiques</p>
            <p className="mt-1 font-serif text-3xl font-bold tabular-nums">{overview.publicStores}</p>
            <Link href="/admin/boutiques" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red hover:underline">
              Gérer les boutiques <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </article>
        </section>
      </div>
    </AdminShell>
  );
}
