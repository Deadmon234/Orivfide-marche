"use client";

import { useActionState, useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateSellerProduct } from "@/app/vendeur/actions";
import type { SellerProduct } from "@/lib/seller-api";

const initialState = { message: "", success: false };

export function ProductEditor({ product }: { product: SellerProduct }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateSellerProduct, initialState);

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-xs font-semibold transition hover:border-orivfide-red hover:text-orivfide-red"
      >
        {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
        {open ? "Fermer" : "Modifier"}
      </button>
      {open && (
        <form
          action={formAction}
          className="mt-4 grid w-full gap-4 rounded-xl bg-[#faf7f6] p-4 sm:grid-cols-2"
        >
          <input type="hidden" name="productId" value={product.id} />
          <label className="seller-field">
            Nom du produit
            <input name="name" defaultValue={product.name} required minLength={2} maxLength={120} />
          </label>
          <label className="seller-field">
            Prix (FCFA)
            <input name="price" type="number" min="1" step="1" defaultValue={product.price} required />
          </label>
          <label className="seller-field sm:col-span-2">
            Description
            <textarea name="description" rows={3} maxLength={2000} defaultValue={product.description} />
          </label>
          <label className="seller-field sm:col-span-2">
            Remplacer la photo (facultatif)
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="file:mr-3 file:rounded-full file:border-0 file:bg-[#fbebed] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orivfide-red"
            />
            <span className="text-xs font-normal text-orivfide-muted">
              L’image actuelle est conservée si aucun fichier n’est choisi · JPEG, PNG ou WebP · 3 Mo maximum
            </span>
          </label>
          {state.message && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 sm:col-span-2">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-full bg-orivfide-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
          >
            {pending ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      )}
    </div>
  );
}
