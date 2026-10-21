"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";
import { setAdminProductVisibility } from "@/app/admin/actions";
import type { AdminProduct } from "@/lib/seller-api";

export function ProductModeration({ products }: { products: AdminProduct[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "visible" | "hidden">("all");
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return products.filter((product) => {
      const matchesStatus = status === "all"
        || (status === "visible" ? product.isActive : !product.isActive);
      const searchable = `${product.name} ${product.store.name} ${product.seller.name} ${product.seller.email}`
        .toLocaleLowerCase("fr");
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [products, query, status]);

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold">Produits récents</h2>
            <p className="mt-1 text-sm text-orivfide-muted">
              Affichage des {products.length} derniers produits. Recherchez par produit, boutique ou vendeur.
            </p>
          </div>
          <span className="rounded-full bg-[#faf7f6] px-3 py-1.5 text-xs font-semibold text-orivfide-muted">
            {filteredProducts.length} résultat(s)
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orivfide-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un produit, une boutique…"
              className="min-h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-orivfide-red"
            />
            <span className="sr-only">Rechercher dans les produits</span>
          </label>
          <label className="seller-field sm:w-52">
            Visibilité
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="min-h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
            >
              <option value="all">Tous les produits</option>
              <option value="visible">Visibles</option>
              <option value="hidden">Masqués</option>
            </select>
          </label>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-orivfide-muted">
          {products.length === 0 ? "Aucun produit n’a encore été créé." : "Aucun produit ne correspond à ces critères."}
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {filteredProducts.map((product) => (
            <li key={product.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:px-6">
              {product.isActive && product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 shrink-0 rounded-xl bg-zinc-100 object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#faf7f6] text-xs text-orivfide-muted">
                  Image
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{product.name}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${product.isActive ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>
                    {product.isActive ? "Visible" : "Masqué"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-orivfide-muted">
                  {product.store.name} · {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                </p>
                <p className="mt-1 truncate text-xs text-orivfide-muted">
                  {product.seller.name} · {product.seller.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {product.isActive && (
                  <Link
                    href={`/boutique/${product.store.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-orivfide-red underline"
                  >
                    Voir la boutique
                  </Link>
                )}
                <form action={setAdminProductVisibility}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="isActive" value={product.isActive ? "false" : "true"} />
                  <button className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition ${product.isActive ? "border-rose-200 text-rose-800 hover:bg-rose-50" : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"}`}>
                    {product.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    {product.isActive ? "Masquer" : "Réafficher"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
