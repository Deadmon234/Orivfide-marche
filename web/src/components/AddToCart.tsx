"use client";

import { useActionState, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { addCustomerCartItem } from "@/app/client/actions";
import type { PublicProductVariant } from "@/lib/seller-api";

const initialState = { message: "", success: false };

export function AddToCart({
  variants = [],
  available,
}: {
  variants?: PublicProductVariant[];
  available?: boolean;
}) {
  const purchasableVariants = variants.filter((variant) => variant.available);
  const [selectedVariant, setSelectedVariant] = useState(
    purchasableVariants[0]?.inventoryItemId ?? "",
  );
  const [state, action, pending] = useActionState(addCustomerCartItem, initialState);

  if (available === false || purchasableVariants.length === 0) {
    return (
      <p className="mt-4 text-sm font-medium text-orivfide-muted">
        {available === false ? "Indisponible pour le moment" : "Choisissez une variante disponible en boutique"}
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
      <input type="hidden" name="inventoryItemId" value={selectedVariant} />
      {purchasableVariants.length > 1 && (
        <label className="seller-field sm:col-span-2">
          Variante
          <select
            value={selectedVariant}
            onChange={(event) => setSelectedVariant(event.target.value)}
            required
          >
            {purchasableVariants.map((variant) => (
              <option key={variant.inventoryItemId} value={variant.inventoryItemId}>
                {variant.label}{variant.sku ? ` · ${variant.sku}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="seller-field">
        Quantité
        <input name="quantity" type="number" min="1" max="1000000" step="1" defaultValue="1" required />
      </label>
      <button
        disabled={pending || !selectedVariant}
        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orivfide-red px-4 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark disabled:opacity-60"
      >
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        {pending ? "Ajout…" : "Ajouter au panier"}
      </button>
      {state.message && (
        <p role="alert" className="text-sm text-rose-800 sm:col-span-2">{state.message}</p>
      )}
    </form>
  );
}
