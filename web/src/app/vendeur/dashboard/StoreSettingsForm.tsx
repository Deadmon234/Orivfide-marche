"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateSellerStore } from "@/app/vendeur/actions";
import type { SellerStore } from "@/lib/seller-api";

const initialState = { message: "", success: false };

export function StoreSettingsForm({ store }: { store: SellerStore }) {
  const [state, formAction, pending] = useActionState(updateSellerStore, initialState);

  return (
    <form action={formAction} className="mt-6 grid gap-4 border-t border-black/5 pt-6 sm:grid-cols-2">
      <label className="seller-field">
        Nom de la boutique
        <input name="name" defaultValue={store.name} required minLength={2} maxLength={120} />
      </label>
      <label className="seller-field">
        Catégorie
        <input name="category" defaultValue={store.category} required maxLength={100} />
      </label>
      <label className="seller-field">
        Téléphone de contact
        <input name="phone" type="tel" defaultValue={store.phone} required minLength={6} maxLength={32} />
      </label>
      <label className="seller-field sm:col-span-2">
        Présentation de la boutique
        <textarea name="description" rows={4} maxLength={1000} defaultValue={store.description} />
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
        <Save className="h-4 w-4" aria-hidden="true" />
        {pending ? "Enregistrement…" : "Enregistrer la boutique"}
      </button>
    </form>
  );
}
