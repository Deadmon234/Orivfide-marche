"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { confirmCustomerCheckout } from "@/app/client/actions";

const initialState = { message: "", success: false };

export function CheckoutPaymentForm() {
  const [state, action, pending] = useActionState(confirmCustomerCheckout, initialState);
  return (
    <form action={action} className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="seller-field sm:col-span-2">Nom du destinataire
          <input name="fullName" required minLength={2} maxLength={120} />
        </label>
        <label className="seller-field">Téléphone de livraison
          <input name="phone" required minLength={6} maxLength={32} />
        </label>
        <label className="seller-field">Numéro MTN (237…)
          <input name="payerPhone" required pattern="237[0-9]{9}" placeholder="2376XXXXXXXX" inputMode="numeric" />
        </label>
        <label className="seller-field sm:col-span-2">Adresse
          <input name="addressLine1" required minLength={5} maxLength={250} />
        </label>
        <label className="seller-field sm:col-span-2">Complément d’adresse
          <input name="addressLine2" maxLength={250} />
        </label>
        <label className="seller-field">Ville
          <input name="city" required minLength={2} maxLength={120} />
        </label>
        <label className="seller-field">Région
          <input name="region" required minLength={2} maxLength={120} />
        </label>
      </div>
      <button disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white disabled:opacity-60">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {pending ? "Préparation du paiement…" : "Payer avec MTN Mobile Money"}
      </button>
      {state.message && <p role="alert" className="text-sm text-rose-800">{state.message}</p>}
      <p className="text-center text-xs leading-5 text-orivfide-muted">Sandbox MTN uniquement. Le stock est réservé jusqu’à l’expiration ou l’échec du paiement.</p>
    </form>
  );
}
