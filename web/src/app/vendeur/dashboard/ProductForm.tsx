"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addSellerProduct } from "@/app/vendeur/actions";

const initialState = { message: "", success: false };

export function ProductForm() {
  const [state, formAction, pending] = useActionState(addSellerProduct, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-black/5 bg-white p-5 sm:grid-cols-2 sm:p-6">
      <h2 className="font-serif text-xl font-bold sm:col-span-2">Ajouter un produit</h2>
      <label className="seller-field">
        Nom du produit
        <input name="name" required minLength={2} maxLength={120} />
      </label>
      <label className="seller-field">
        Prix (FCFA)
        <input name="price" type="number" min="1" step="1" required />
      </label>
      <label className="seller-field sm:col-span-2">
        Photo du produit
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="file:mr-3 file:rounded-full file:border-0 file:bg-[#fbebed] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orivfide-red"
        />
        <span className="text-xs font-normal text-orivfide-muted">
          JPEG, PNG ou WebP · 3 Mo maximum
        </span>
      </label>
      <label className="seller-field sm:col-span-2">
        Description
        <textarea name="description" rows={3} maxLength={2000} />
      </label>
      {state.message && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800 sm:col-span-2">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orivfide-red px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {pending ? "Enregistrement…" : "Ajouter à mes produits"}
      </button>
    </form>
  );
}
