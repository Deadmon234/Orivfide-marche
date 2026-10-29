import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { getCustomerOrder, SellerApiError } from "@/lib/seller-api";
import { PaymentStatusButton } from "./PaymentStatusButton";

export const instant = false;

const statusLabels: Record<string, string> = {
  awaiting_payment: "En attente du paiement MTN",
  awaiting_vendor_confirmation: "En attente du vendeur",
  confirmed: "Confirmée", preparing: "Préparation en cours",
  handed_to_carrier: "Remise au transporteur", in_transit: "En livraison",
  delivered: "Livrée", cancelled: "Annulée", delivery_failed: "Livraison échouée",
  returned: "Retournée", disputed: "Litige",
};

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  await connection();
  const { orderId } = await params;
  let result;
  try { result = await getCustomerOrder(orderId); }
  catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/client/connexion?retour=commandes");
    if (error instanceof SellerApiError && error.status === 404) notFound();
    throw error;
  }
  const { order } = result;

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center px-5 sm:px-8">
          <Link href="/commandes" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red"><ArrowLeft className="h-4 w-4" />Mes commandes</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-muted">{order.publicNumber}</p><h1 className="mt-2 font-serif text-3xl font-bold">Commande</h1></div>
          <span className="rounded-full bg-[#fbebed] px-3 py-1 text-xs font-semibold text-orivfide-red">{statusLabels[order.status] ?? order.status}</span>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            {order.sellerOrders.map((sellerOrder) => (
              <article key={sellerOrder.id} className="rounded-2xl border border-black/5 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs text-orivfide-muted">Boutique</p><h2 className="mt-1 font-serif text-xl font-bold">{sellerOrder.store.name}</h2></div>
                  <span className="text-sm font-semibold text-orivfide-red">{statusLabels[sellerOrder.status] ?? sellerOrder.status}</span>
                </div>
                <div className="mt-5 divide-y divide-black/5">
                  {sellerOrder.items.map((item) => (
                    <div key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fbebed] text-orivfide-red"><Package className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1"><p className="font-semibold">{item.productName}</p><p className="mt-1 text-sm text-orivfide-muted">{item.variantLabel} · {item.quantity} × {new Intl.NumberFormat("fr-FR").format(item.unitPriceXaf)} FCFA</p></div>
                      <p className="font-semibold">{new Intl.NumberFormat("fr-FR").format(item.lineTotalXaf)} FCFA</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
          <aside className="h-fit space-y-5">
            <section className="rounded-2xl border border-black/5 bg-white p-5"><h2 className="font-serif text-xl font-bold">Récapitulatif</h2><p className="mt-4 flex justify-between text-base font-bold"><span>Total</span><span>{new Intl.NumberFormat("fr-FR").format(order.subtotalXaf)} FCFA</span></p>{order.status === "awaiting_payment" && <PaymentStatusButton orderId={order.id} />}</section>
            <section className="rounded-2xl border border-black/5 bg-white p-5"><h2 className="font-serif text-xl font-bold">Historique</h2><ol className="mt-4 space-y-4">{order.events.map((event) => (<li key={event.id} className="border-l border-orivfide-red/30 pl-4"><p className="text-sm font-semibold">{statusLabels[event.newStatus] ?? event.newStatus}</p><p className="mt-1 text-xs leading-5 text-orivfide-muted">{event.reason}</p><p className="mt-1 text-xs text-orivfide-muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</p></li>))}</ol></section>
          </aside>
        </div>
      </div>
    </main>
  );
}
