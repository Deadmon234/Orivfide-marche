"use client";

import { useState } from "react";
import { checkCustomerMtnPayment } from "@/app/client/actions";

export function PaymentStatusButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function checkStatus() {
    setPending(true);
    try {
      const result = await checkCustomerMtnPayment(orderId);
      setStatus(result);
      if (result === "successful") window.location.reload();
    } catch {
      setStatus("error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={checkStatus} disabled={pending} className="min-h-11 w-full rounded-full bg-orivfide-red px-4 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Vérification…" : "Vérifier le paiement MTN"}
      </button>
      {status && <p role="status" className="mt-3 text-sm text-orivfide-muted">{status === "successful" ? "Paiement confirmé." : status === "error" ? "La vérification a échoué." : `Statut : ${status}`}</p>}
    </div>
  );
}
