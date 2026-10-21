import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  Settings2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { getSellerDashboard } from "@/lib/seller-api";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { signOutSeller, toggleSellerProduct } from "@/app/vendeur/actions";
import { ProductForm } from "./ProductForm";
import { ProductEditor } from "./ProductEditor";
import { StoreSettingsForm } from "./StoreSettingsForm";

export const metadata = {
  title: "Tableau de bord vendeur | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string; boutique?: string }>;
}) {
  await connection();
  const { seller, store, products } = await getSellerDashboard();
  if (seller.status !== "active") redirect("/vendeur/statut");
  const params = await searchParams;

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
          <a className="seller-nav-item seller-nav-item-active" href="#apercu">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Vue d’ensemble
          </a>
          <a className="seller-nav-item" href="#produits">
            <Package className="h-4 w-4" aria-hidden="true" /> Mes produits
          </a>
          <a className="seller-nav-item" href="#boutique">
            <Settings2 className="h-4 w-4" aria-hidden="true" /> Ma boutique
          </a>
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
            <p className="text-xs text-orivfide-muted">Espace vendeur / Tableau de bord</p>
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
          <div id="apercu">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">
              Tableau de bord
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">
              Bonjour {seller.fullName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm leading-6 text-orivfide-muted">
              Gérez les informations de votre boutique et préparez votre catalogue.
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Votre boutique est validée et active</p>
              <p className="mt-1 text-sm leading-6">
                Votre boutique est accessible au public. Ajoutez vos produits et gardez leurs informations à jour.
              </p>
            </div>
          </div>

          {params.produit === "ajoute" && (
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Le produit a été ajouté à votre boutique.
            </p>
          )}
          {params.produit === "modifie" && (
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Les informations du produit ont été mises à jour.
            </p>
          )}
          {params.boutique === "modifiee" && (
            <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Les informations de la boutique ont été mises à jour.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Produits au catalogue", value: products.length, icon: Package },
              { label: "Produits actifs", value: products.filter((product) => product.isActive).length, icon: LayoutDashboard },
              { label: "Statut de la boutique", value: "Active", icon: Store },
            ].map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-black/5 bg-white p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fbebed] text-orivfide-red">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm text-orivfide-muted">{label}</p>
                <p className="mt-1 font-serif text-2xl font-bold">{value}</p>
              </article>
            ))}
          </div>

          <section id="produits" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold">Mes produits</h2>
              <p className="mt-1 text-sm text-orivfide-muted">
                Les produits actifs apparaissent dans votre vitrine publique.
              </p>
            </div>
            <ProductForm />
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
                <h3 className="font-semibold">Catalogue</h3>
                <span className="text-xs text-orivfide-muted">{products.length} produit(s)</span>
              </div>
              {products.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-orivfide-muted">
                  Aucun produit pour le moment. Utilisez le formulaire ci-dessus pour commencer.
                </p>
              ) : (
                <ul className="divide-y divide-black/5">
                  {products.map((product) => (
                    <li key={product.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt=""
                          width={64}
                          height={64}
                          unoptimized
                          className="h-16 w-16 rounded-xl bg-zinc-100 object-cover"
                        />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#faf7f6] text-orivfide-red">
                          <Package className="h-6 w-6" aria-hidden="true" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{product.name}</p>
                        <p className="mt-1 text-sm text-orivfide-muted">
                          {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                        </p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
                        {product.isActive ? "Actif · public" : "Masqué"}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <ProductEditor product={product} />
                        <form action={toggleSellerProduct}>
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="isActive" value={product.isActive ? "false" : "true"} />
                          <button className="min-h-10 rounded-full border border-black/10 px-4 text-xs font-semibold transition hover:border-orivfide-red hover:text-orivfide-red">
                            {product.isActive ? "Masquer" : "Réactiver"}
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section id="boutique" className="scroll-mt-24 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div>
                <h2 className="font-serif text-2xl font-bold">Ma boutique</h2>
                <p className="mt-2 text-sm text-orivfide-muted">
                  {store.name} · {store.category}
                </p>
                <p className="mt-1 text-xs text-orivfide-muted">
                  Adresse publique :{" "}
                  <Link className="font-medium text-orivfide-red underline" href={`/boutique/${store.slug}`}>
                    /boutique/{store.slug}
                  </Link>
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Boutique active
              </span>
            </div>
            <Link href="/accueil" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Revenir au site public
            </Link>
            <StoreSettingsForm store={store} />
          </section>
        </div>
      </section>
    </main>
  );
}
