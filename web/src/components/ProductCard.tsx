import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToCart } from "@/components/AddToCart";
import type { SellerProduct } from "@/lib/seller-api";

export function ProductCard({
  product,
  storeName,
  storeSlug,
  category,
}: {
  product: SellerProduct;
  storeName: string;
  storeSlug: string;
  category?: string;
}) {
  const favorite = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    storeName,
    storeSlug,
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_rgba(40,14,19,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(40,14,19,0.1)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eee7e4]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 30vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-orivfide-red">
            <Package className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <FavoriteButton product={favorite} className="absolute right-3 top-3 z-10" />
        {category && (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-orivfide-red backdrop-blur">
            {category}
          </span>
        )}
        {product.available === false && (
          <span className="absolute left-3 top-3 rounded-full bg-[#241014]/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            Épuisé
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <Link
          href={`/boutique/${encodeURIComponent(storeSlug)}`}
          className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-orivfide-muted transition hover:text-orivfide-red"
        >
          <span className="truncate">{storeName}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Link>
        <h3 className="mt-2 line-clamp-1 font-serif text-lg font-bold text-[#241518]">{product.name}</h3>
        <p className="mt-2 text-lg font-bold text-orivfide-red">
          {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
        </p>
        {product.available === false && (
          <p className="mt-1 text-sm font-medium text-rose-800">Actuellement indisponible</p>
        )}
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-orivfide-muted">{product.description}</p>
        )}
        <AddToCart variants={product.variants} available={product.available} />
        <Link
          href={`/boutique/${encodeURIComponent(storeSlug)}`}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red transition hover:gap-3"
        >
          Voir la boutique <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
