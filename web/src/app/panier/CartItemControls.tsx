"use client";

import { useActionState } from "react";
import { removeCustomerCartItem, updateCustomerCartItem } from "@/app/client/actions";

const initialState = { message: "", success: false };

export function CartItemControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const [state, action, pending] = useActionState(updateCustomerCartItem, initialState);
  return (
    <div className="mt-4 flex flex-wrap items-end gap-3">
      <form action={action} className="flex items-end gap-2">
        <input type="hidden" name="itemId" value={itemId} />
        <label className="seller-field">
          Quantité
          <input name="quantity" type="number" min="1" max="1000000" defaultValue={quantity} required />
        </label>
        <button disabled={pending} className="min-h-10 rounded-full border border-black/10 px-4 text-xs font-semibold disabled:opacity-60">
          {pending ? "…" : "Mettre à jour"}
        </button>
      </form>
      <form action={removeCustomerCartItem}>
        <input type="hidden" name="itemId" value={itemId} />
        <button className="min-h-10 px-2 text-xs font-semibold text-rose-800 hover:underline">
          Retirer
        </button>
      </form>
      {state.message && <p role="alert" className="w-full text-sm text-rose-800">{state.message}</p>}
    </div>
  );
}
