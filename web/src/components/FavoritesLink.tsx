"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/FavoritesProvider";

export function FavoritesLink({ className = "" }: { className?: string }) {
  const { favorites } = useFavorites();
  return (
    <Link
      href="/favoris"
      aria-label={`Mes favoris${favorites.length ? `, ${favorites.length} produit(s)` : ""}`}
      className={className}
    >
      <Heart aria-hidden="true" size={16} />
      Favoris
      {favorites.length > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orivfide-red px-1 text-[0.65rem] font-bold text-white">
          {favorites.length}
        </span>
      )}
    </Link>
  );
}
