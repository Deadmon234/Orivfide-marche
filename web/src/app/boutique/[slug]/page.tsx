import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowRight, Package, ShieldCheck, Store } from "lucide-react";
import { FavoritesLink } from "@/components/FavoritesLink";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { ProductCard } from "@/components/ProductCard";
import { publicSellerApi, SellerApiError, type PublicStore } from "@/lib/seller-api";

export const instant = false;
export const metadata = {
  title: "Boutique | ORIVFIDE",
  robots: { index: true, follow: true },
};

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  let result: PublicStore;

  try {
    result = await publicSellerApi<PublicStore>(
      `/api/public/stores/${encodeURIComponent(slug)}`,
    );
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 404) notFound();
    throw error;
  }

  const { store, products } = result;

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/accueil" aria-label="Retour à ORIVFIDE">
            <OrivfideLogo />
          </Link>
          <div className="flex items-center gap-4">
            <FavoritesLink className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red" />
            <Link href="/accueil#boutiques" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Boutiques
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#241014] px-6 py-10 text-white shadow-[0_24px_70px_rgba(40,14,19,0.14)] sm:px-10 sm:py-14">
          {products[0]?.imageUrl && (
            <>
              <Image
                src={products[0].imageUrl}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="absolute inset-0 -z-20 object-cover opacity-35"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#241014] via-[#241014]/90 to-[#241014]/35" />
            </>
          )}
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur">
              <Store className="h-4 w-4 text-[#ffb7c3]" aria-hidden="true" /> {store.category}
            </p>
            <h1 className="mt-5 font-serif text-3xl font-bold sm:text-5xl">{store.name}</h1>
            {store.description && (
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">{store.description}</p>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">
                <Package className="h-4 w-4 text-[#ffb7c3]" aria-hidden="true" />
                {products.length} produit(s) disponible(s)
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90">
                <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                Boutique vérifiée
              </span>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Le catalogue</p>
              <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">Découvrez nos produits</h2>
              <p className="mt-2 text-sm text-orivfide-muted">Enregistrez vos coups de cœur en touchant le cœur sur une fiche produit.</p>
            </div>
            <Link href="/favoris" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red hover:gap-3">
              Voir mes favoris <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-black/10 bg-white px-5 py-14 text-center">
              <Package className="mx-auto h-8 w-8 text-orivfide-red" aria-hidden="true" />
              <p className="mt-4 font-semibold">Cette boutique prépare son catalogue.</p>
              <p className="mt-2 text-sm text-orivfide-muted">Les produits apparaîtront ici dès leur publication.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeName={store.name}
                  storeSlug={store.slug}
                  category={store.category}
                />
              ))}
            </div>
          )}
          <p className="mt-8 rounded-2xl border border-[#c41230]/10 bg-white px-5 py-4 text-sm leading-6 text-orivfide-muted">
            Pour connaître la disponibilité, la livraison et les modalités de paiement, contactez directement la boutique. La commande en ligne n’est pas encore proposée.
          </p>
        </section>
      </div>
    </main>
  );
}
