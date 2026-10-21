"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Heart, Package, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { PublicStoreListing } from "@/lib/seller-api";

export function MarketplaceSection({
  stores,
  unavailable = false,
}: {
  stores: PublicStoreListing[];
  unavailable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filteredStores = useMemo(
    () => stores.filter(({ store, products }) => (
      `${store.name} ${store.category} ${products.map((product) => product.name).join(" ")}`
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery)
    )),
    [stores, normalizedQuery],
  );
  const products = filteredStores.flatMap(({ store, products: storeProducts }) => (
    storeProducts.map((product) => ({ product, store }))
  ));

  return (
    <section id="boutiques" className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="home-eyebrow">La marketplace ORIVFIDE</p>
            <h2 className="home-section-title">Des boutiques à découvrir, des produits à aimer.</h2>
            <p className="mt-4 text-base leading-7 text-[#706566]">
              Explorez les vitrines validées par ORIVFIDE et retrouvez les produits proposés par chaque boutique.
            </p>
          </div>
          <Link className="home-text-link shrink-0" href="/favoris">
            <Heart aria-hidden="true" size={17} /> Mes favoris <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>

        {stores.length > 0 && (
          <label className="mt-8 block max-w-lg">
            <span className="sr-only">Rechercher une boutique, une catégorie ou un produit</span>
            <span className="flex min-h-12 items-center gap-3 rounded-full border border-black/10 bg-[#faf7f6] px-5 focus-within:border-orivfide-red">
              <Store aria-hidden="true" className="h-4 w-4 text-orivfide-red" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une boutique ou un produit"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-orivfide-muted"
              />
            </span>
          </label>
        )}

        {unavailable ? (
          <div className="mt-9 rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
            <Store className="mx-auto h-8 w-8 text-amber-800" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-2xl font-bold">Les boutiques ne sont pas accessibles pour le moment</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-amber-950/75">
              Le service de catalogue est temporairement indisponible. Réessayez dans quelques instants.
            </p>
          </div>
        ) : stores.length === 0 ? (
          <div className="mt-9 rounded-3xl border border-dashed border-orivfide-red/20 bg-[#fffafa] px-6 py-12 text-center">
            <Store className="mx-auto h-9 w-9 text-orivfide-red" aria-hidden="true" />
            <h3 className="mt-4 font-serif text-2xl font-bold">Les boutiques arrivent bientôt</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-orivfide-muted">
              Les boutiques apparaîtront ici dès qu’elles auront été approuvées par l’équipe ORIVFIDE.
            </p>
            <Link className="home-button-primary mt-6" href="/vendeur/inscription">
              Ouvrir une boutique <ArrowRight aria-hidden="true" size={17} />
            </Link>
          </div>
        ) : filteredStores.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-[#faf7f6] p-6 text-center text-sm text-orivfide-muted">
            Aucun résultat pour « {query} ». Essayez un autre nom ou une autre catégorie.
          </p>
        ) : (
          <>
            <div className="mt-9 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orivfide-red">Vitrines</p>
                <h3 className="mt-2 font-serif text-2xl font-bold">Boutiques à explorer</h3>
              </div>
              <span className="text-sm text-orivfide-muted">{filteredStores.length} boutique(s)</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map(({ store, products: storeProducts }) => (
                <article
                  key={store.id}
                  className="group overflow-hidden rounded-[1.35rem] border border-black/[0.07] bg-white shadow-[0_12px_35px_rgba(40,14,19,0.06)] transition duration-300 hover:-translate-y-1 hover:border-orivfide-red/20 hover:shadow-[0_22px_48px_rgba(40,14,19,0.13)]"
                >
                  <Link
                    href={`/boutique/${encodeURIComponent(store.slug)}`}
                    aria-label={`Entrer dans la boutique ${store.name}`}
                    className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orivfide-red"
                  >
                    <span className="relative block h-36 overflow-hidden bg-[#37121b] sm:h-40">
                      {storeProducts[0]?.imageUrl ? (
                        <Image
                          src={storeProducts[0].imageUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                          className="object-cover opacity-65 transition duration-700 group-hover:scale-105 group-hover:opacity-75"
                        />
                      ) : (
                        <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(255,183,195,0.3),transparent_40%),linear-gradient(130deg,#241014,#75152b)]" />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-[#1c0b10]/85 via-[#1c0b10]/15 to-black/10" />
                      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-[0.68rem] font-semibold text-white backdrop-blur-md">
                        <Store className="h-3.5 w-3.5" aria-hidden="true" />
                        {store.category}
                      </span>
                      <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
                        <span className="font-serif text-sm font-semibold tracking-wide text-white/75">VITRINE ORIVFIDE</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[0.68rem] font-semibold text-[#246b48] shadow-sm">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Vérifiée
                        </span>
                      </span>
                    </span>

                    <span className="block px-5 pb-5">
                      <span className="-mt-7 flex items-end justify-between gap-3">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-[#fbebed] font-serif text-xl font-bold text-orivfide-red shadow-md">
                          {store.name.trim().slice(0, 1).toLocaleUpperCase("fr")}
                        </span>
                        <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-orivfide-muted">
                          <Package className="h-3.5 w-3.5 text-orivfide-red" aria-hidden="true" />
                          {storeProducts.length === 0
                            ? "Catalogue en préparation"
                            : `${storeProducts.length}${storeProducts.length === 4 ? "+" : ""} article(s)`}
                        </span>
                      </span>

                      <span className="mt-3 flex items-center justify-between gap-3">
                        <span className="truncate font-serif text-xl font-bold text-[#241518]">{store.name}</span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faf7f6] text-orivfide-red transition group-hover:bg-orivfide-red group-hover:text-white">
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-orivfide-muted">
                        Découvrez les produits de cette boutique
                      </span>

                      {storeProducts.length > 0 && (
                        <span className="mt-5 grid grid-cols-4 gap-2 border-t border-black/[0.06] pt-4">
                          {storeProducts.slice(0, 4).map((product) => (
                            <span key={product.id} className="min-w-0">
                              <span className="relative block aspect-square overflow-hidden rounded-xl bg-[#f1ecea]">
                                {product.imageUrl ? (
                                  <Image
                                    src={product.imageUrl}
                                    alt=""
                                    fill
                                    unoptimized
                                    sizes="72px"
                                    className="object-cover transition duration-500 group-hover:scale-[1.02]"
                                  />
                                ) : (
                                  <span className="flex h-full items-center justify-center text-orivfide-red">
                                    <Package className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                )}
                              </span>
                              <span className="mt-1.5 block truncate text-[0.65rem] font-medium text-orivfide-muted">
                                {product.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[0.67rem] font-bold text-[#241518]">
                                {new Intl.NumberFormat("fr-FR").format(product.price)} F
                              </span>
                            </span>
                          ))}
                          {storeProducts.length < 4 && Array.from({ length: 4 - storeProducts.length }, (_, index) => (
                            <span
                              key={`more-${index}`}
                              className="aspect-square rounded-xl border border-dashed border-black/10 bg-[#faf7f6]"
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                      )}
                    </span>
                  </Link>
                </article>
              ))}
            </div>

            <div className="mt-14 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orivfide-red">Sélection</p>
                <h3 className="mt-2 font-serif text-2xl font-bold">Produits récemment ajoutés</h3>
              </div>
              <span className="hidden text-sm text-orivfide-muted sm:inline">{products.length} produit(s)</span>
            </div>
            {products.length === 0 ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#faf7f6] p-5 text-sm text-orivfide-muted">
                <Package className="h-5 w-5 shrink-0 text-orivfide-red" aria-hidden="true" />
                Les vendeurs préparent leurs premiers produits. Consultez les boutiques pour en savoir plus.
              </div>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map(({ product, store }) => (
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
          </>
        )}
      </div>
    </section>
  );
}
