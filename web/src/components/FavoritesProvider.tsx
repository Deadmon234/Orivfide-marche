"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type FavoriteProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  storeName: string;
  storeSlug: string;
};

type FavoritesContextValue = {
  favorites: FavoriteProduct[];
  toggleFavorite: (product: FavoriteProduct) => void;
};

const storageKey = "orivfide_favorite_products";
const emptyFavorites: FavoriteProduct[] = [];
const FavoritesContext = createContext<FavoritesContextValue | null>(null);
let cachedStorageValue: string | null | undefined;
let cachedFavorites = emptyFavorites;
const listeners = new Set<() => void>();

function isFavoriteProduct(value: unknown): value is FavoriteProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  return typeof product.id === "string"
    && typeof product.name === "string"
    && typeof product.description === "string"
    && typeof product.price === "number"
    && (typeof product.imageUrl === "string" || product.imageUrl === null)
    && typeof product.storeName === "string"
    && typeof product.storeSlug === "string";
}

function getFavoritesSnapshot() {
  if (typeof window === "undefined") return emptyFavorites;

  let stored: string | null;
  try {
    stored = window.localStorage.getItem(storageKey);
  } catch (error) {
    console.error("Could not read saved ORIVFIDE favorites.", error);
    return cachedFavorites;
  }
  if (stored === cachedStorageValue) return cachedFavorites;

  cachedStorageValue = stored;
  if (!stored) {
    cachedFavorites = emptyFavorites;
    return cachedFavorites;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    cachedFavorites = Array.isArray(parsed) ? parsed.filter(isFavoriteProduct) : emptyFavorites;
  } catch (error) {
    console.error("Could not parse saved ORIVFIDE favorites.", error);
    cachedFavorites = emptyFavorites;
  }
  return cachedFavorites;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    cachedStorageValue = undefined;
    getFavoritesSnapshot();
    listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function saveFavorites(favorites: FavoriteProduct[]) {
  cachedFavorites = favorites;
  try {
    cachedStorageValue = JSON.stringify(favorites);
    window.localStorage.setItem(storageKey, cachedStorageValue);
  } catch (error) {
    cachedStorageValue = undefined;
    console.error("Could not persist ORIVFIDE favorites on this device.", error);
  }
  listeners.forEach((listener) => listener());
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const favorites = useSyncExternalStore(subscribe, getFavoritesSnapshot, () => emptyFavorites);
  const toggleFavorite = useCallback((product: FavoriteProduct) => {
    const current = getFavoritesSnapshot();
    const next = current.some((item) => item.id === product.id)
      ? current.filter((item) => item.id !== product.id)
      : [product, ...current];
    saveFavorites(next);
  }, []);
  const value = useMemo(
    () => ({ favorites, toggleFavorite }),
    [favorites, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used within FavoritesProvider.");
  return context;
}
