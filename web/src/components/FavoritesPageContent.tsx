"use client";

import Link from "next/link";
import { ArrowLeft, Heart, Store } from "lucide-react";
import { useFavorites } from "@/components/FavoritesProvider";
import { ProductCard } from "@/components/ProductCard";

export function FavoritesPageContent() {
  const { favorites } = useFavorites();

  return (
    <main className="min-h-screen bg-[#faf7f6] px-5 py-10 text-[#241518] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <Link href="/accueil" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red hover:gap-3">
          <ArrowLeft aria-hidden="true" size={16} /> Retour aux boutiques
        </Link>
        <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Votre sélection</p>
            <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mes produits favoris</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-orivfide-muted">
              Retrouvez les produits que vous avez enregistrés sur cet appareil.
            </p>
          </div>
          {favorites.length > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fbebed] px-4 py-2 text-sm font-semibold text-orivfide-red">
              <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
              {favorites.length} produit(s)
            </span>
          )}
        </header>

        {favorites.length === 0 ? (
          <div className="mt-9 rounded-3xl border border-dashed border-orivfide-red/20 bg-white px-6 py-14 text-center">
            <Heart className="mx-auto h-9 w-9 text-orivfide-red" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-2xl font-bold">Votre sélection commence ici</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-orivfide-muted">
              Touchez le cœur sur un produit pour le retrouver facilement dans cette liste.
            </p>
            <Link href="/accueil#boutiques" className="home-button-primary mt-6">
              <Store aria-hidden="true" size={17} /> Explorer les boutiques
            </Link>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  description: product.description,
                  price: product.price,
                  imageUrl: product.imageUrl,
                  isActive: true,
                  createdAt: "",
                }}
                storeName={product.storeName}
                storeSlug={product.storeSlug}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
