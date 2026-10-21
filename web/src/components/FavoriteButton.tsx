"use client";

import { Heart } from "lucide-react";
import { useFavorites, type FavoriteProduct } from "@/components/FavoritesProvider";

export function FavoriteButton({
  product,
  className = "",
}: {
  product: FavoriteProduct;
  className?: string;
}) {
  const { favorites, toggleFavorite } = useFavorites();
  const isFavorite = favorites.some((favorite) => favorite.id === product.id);

  return (
    <button
      type="button"
      aria-label={isFavorite ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
      aria-pressed={isFavorite}
      onClick={() => toggleFavorite(product)}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-orivfide-red shadow-sm transition hover:scale-105 hover:bg-[#fbebed] ${className}`}
    >
      <Heart
        aria-hidden="true"
        size={19}
        className={isFavorite ? "fill-current" : ""}
      />
    </button>
  );
}
