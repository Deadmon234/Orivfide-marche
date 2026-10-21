"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Store } from "lucide-react";
import { setAdminStoreVisibility } from "@/app/admin/actions";
import type { AdminStore } from "@/lib/seller-api";

const sellerStatus = {
  active: "Compte approuvé",
  pending_review: "En attente",
  rejected: "Refusé",
} as const;

export function StoreManagement({ stores }: { stores: AdminStore[] }) {
  const [query, setQuery] = useState("");
  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return stores.filter((store) =>
      `${store.name} ${store.category} ${store.seller.name} ${store.seller.email}`
        .toLocaleLowerCase("fr")
        .includes(normalizedQuery),
    );
  }, [stores, query]);

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-black/5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <h2 className="font-serif text-xl font-bold">Boutiques récentes</h2>
          <p className="mt-1 text-sm text-orivfide-muted">
            Les {stores.length} dernières boutiques. Seules les boutiques de vendeurs approuvés peuvent être publiées.
          </p>
        </div>
        <label className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orivfide-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une boutique ou un vendeur"
            className="min-h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-orivfide-red"
          />
          <span className="sr-only">Rechercher une boutique ou un vendeur</span>
        </label>
      </div>

      {filteredStores.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-orivfide-muted">
          {stores.length === 0 ? "Aucune boutique n’a encore été créée." : "Aucune boutique ne correspond à cette recherche."}
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {filteredStores.map((store) => {
            const canPublish = store.seller.status === "active";
            return (
              <li key={store.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:px-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fbebed] text-orivfide-red">
                  <Store className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{store.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${store.isPublic ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-700"}`}>
                      {store.isPublic ? "Publique" : "Privée"}
                    </span>
                    <span className="rounded-full bg-[#faf7f6] px-2.5 py-1 text-[0.7rem] font-semibold text-orivfide-muted">
                      {sellerStatus[store.seller.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-orivfide-muted">{store.category} · {store.productCount} produit(s)</p>
                  <p className="mt-1 truncate text-xs text-orivfide-muted">{store.seller.name} · {store.seller.email}</p>
                  {store.description && (
                    <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-orivfide-muted">{store.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {store.isPublic && (
                    <Link
                      href={`/boutique/${store.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-orivfide-red underline"
                    >
                      Voir la vitrine
                    </Link>
                  )}
                  {(store.isPublic || canPublish) && (
                    <form action={setAdminStoreVisibility}>
                      <input type="hidden" name="storeId" value={store.id} />
                      <input type="hidden" name="isPublic" value={store.isPublic ? "false" : "true"} />
                      <button className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition ${store.isPublic ? "border-rose-200 text-rose-800 hover:bg-rose-50" : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"}`}>
                        {store.isPublic ? "Retirer du public" : "Publier la boutique"}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
