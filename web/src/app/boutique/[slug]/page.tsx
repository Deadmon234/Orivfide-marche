import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, Package, Store } from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { publicSellerApi, SellerApiError, type PublicStore } from "@/lib/seller-api";

export const instant = false;
export const metadata = {
  title: "Boutique de test | ORIVFIDE",
  robots: { index: false, follow: false },
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

  const { store, products, isDraftAgreement, publicTestStore } = result;

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/accueil" aria-label="Retour à ORIVFIDE">
            <OrivfideLogo />
          </Link>
          <Link href="/accueil" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour au site
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {publicTestStore && (
          <aside className="mb-8 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <Store className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Boutique publique de test</p>
              <p className="mt-1 text-sm leading-6">
                Cette vitrine est publiée pour tester ORIVFIDE. Le document vendeur associé est
                un brouillon non contractuel ; il ne remplace pas le contrat définitif de la plateforme.
                Les commandes et paiements en ligne ne sont pas disponibles.
              </p>
            </div>
          </aside>
        )}
        {isDraftAgreement && !publicTestStore && (
          <aside className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Cette boutique de démonstration est associée au brouillon non contractuel du vendeur.
          </aside>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#fbebed] px-3 py-1.5 text-xs font-semibold text-orivfide-red">
            <Store className="h-4 w-4" aria-hidden="true" /> {store.category}
          </p>
          <h1 className="mt-5 font-serif text-3xl font-bold sm:text-5xl">{store.name}</h1>
          {store.description && (
            <p className="mt-4 max-w-3xl text-base leading-7 text-orivfide-muted">{store.description}</p>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">
                Catalogue
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">Produits présentés</h2>
            </div>
            <span className="text-sm text-orivfide-muted">{products.length} produit(s)</span>
          </div>

          {products.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-14 text-center">
              <Package className="mx-auto h-8 w-8 text-orivfide-red" aria-hidden="true" />
              <p className="mt-4 font-semibold">Cette boutique prépare son catalogue.</p>
              <p className="mt-2 text-sm text-orivfide-muted">Les produits seront affichés ici lorsqu’ils seront ajoutés.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                  <div className="relative aspect-[4/3] bg-[#eee7e4]">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-orivfide-red">
                        <Package className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                    {publicTestStore && (
                      <span className="absolute left-3 top-3 rounded-full bg-amber-100 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-amber-950">
                        Produit de test
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif text-xl font-bold">{product.name}</h3>
                    <p className="mt-2 text-lg font-semibold text-orivfide-red">
                      {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                    </p>
                    {product.description && (
                      <p className="mt-3 text-sm leading-6 text-orivfide-muted">{product.description}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
