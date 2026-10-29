import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowRight, LayoutDashboard, Package, Store } from "lucide-react";
import { getSellerDashboard, SellerApiError } from "@/lib/seller-api";
import { SellerShell } from "./SellerShell";

export const metadata = {
  title: "Vue d’ensemble vendeur | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerDashboardPage() {
  await connection();
  let dashboard;
  try {
    dashboard = await getSellerDashboard();
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/vendeur/connexion");
    }
    throw error;
  }
  const { seller, store, products } = dashboard;
  if (seller.status !== "active") redirect("/vendeur/statut");

  const sections = [
    {
      href: "/vendeur/dashboard/produits",
      title: "Mes produits",
      description: "Créer, modifier et gérer les produits de votre catalogue.",
      count: `${products.length} produit(s)`,
      icon: Package,
    },
    {
      href: "/vendeur/dashboard/stock",
      title: "Stock",
      description: "Suivre vos quantités, ajuster le stock et gérer les variantes.",
      count: "Inventaire et alertes",
      icon: LayoutDashboard,
    },
    {
      href: "/vendeur/dashboard/boutique",
      title: "Ma boutique",
      description: "Mettre à jour les informations et consulter votre vitrine publique.",
      count: store.category,
      icon: Store,
    },
  ];

  return (
    <SellerShell seller={seller} store={store} activePage="overview">
      <section className="rounded-2xl bg-gradient-to-br from-[#241014] via-[#42131d] to-[#8f1027] p-5 text-white shadow-lg sm:rounded-3xl sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Tableau de bord vendeur</p>
        <h1 className="mt-2 font-serif text-2xl font-bold sm:mt-3 sm:text-4xl">
          Bonjour {seller.fullName.split(" ")[0]}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 sm:mt-3">
          Retrouvez chaque outil dans sa propre page et gérez votre activité depuis un espace organisé.
        </p>
      </section>

      <section aria-label="Indicateurs de la boutique" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Produits au catalogue", value: products.length, icon: Package },
          { label: "Produits actifs", value: products.filter((product) => product.isActive).length, icon: LayoutDashboard },
          { label: "Statut de la boutique", value: "Active", icon: Store },
        ].map(({ label, value, icon: Icon }, index) => (
          <article
            key={label}
            className={`min-w-0 rounded-2xl border border-black/5 bg-white p-4 sm:p-5${index === 2 ? " col-span-2 sm:col-span-1" : ""}`}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbebed] text-orivfide-red sm:h-10 sm:w-10">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-xs leading-5 text-orivfide-muted sm:mt-4 sm:text-sm">{label}</p>
            <p className="mt-1 truncate font-serif text-xl font-bold sm:text-2xl">{value}</p>
          </article>
        ))}
      </section>

      <section aria-label="Sections de gestion" className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {sections.map(({ href, title, description, count, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group min-w-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orivfide-red/30 hover:shadow-md sm:p-6"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbebed] text-orivfide-red sm:h-11 sm:w-11">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-serif text-lg font-bold sm:mt-5 sm:text-xl">{title}</h2>
            <p className="mt-2 min-h-12 text-xs leading-5 text-orivfide-muted sm:text-sm sm:leading-6">{description}</p>
            <span className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-orivfide-red sm:mt-4 sm:text-sm">
              <span className="truncate">{count}</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>
    </SellerShell>
  );
}
