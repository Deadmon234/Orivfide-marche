import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSellerDashboard, getSellerOrder } from "@/lib/seller-api";
import { updateSellerOrderStatus } from "@/app/vendeur/actions";
import { SellerShell } from "../../SellerShell";

export const metadata = { title: "Détail commande vendeur | ORIVFIDE", robots: { index: false, follow: false } };
export const instant = false;

const statusLabels: Record<string, string> = {
  awaiting_vendor_confirmation: "En attente de confirmation", confirmed: "Confirmée", preparing: "Préparation",
  handed_to_carrier: "Remise au transporteur", in_transit: "En livraison", delivered: "Livrée", cancelled: "Annulée",
  delivery_failed: "Échec de livraison", returned: "Retournée", disputed: "Litige",
};
const nextStatuses: Record<string, string[]> = {
  awaiting_vendor_confirmation: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"],
  preparing: ["handed_to_carrier", "cancelled"], handed_to_carrier: ["in_transit", "cancelled"],
  in_transit: ["delivered", "delivery_failed", "returned", "disputed"], delivery_failed: ["returned", "disputed"], returned: ["disputed"],
};

export default async function SellerOrderDetailPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ statut?: string }> }) {
  await connection();
  const { orderId } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) redirect("/vendeur/dashboard/commandes");
  const [{ seller, store }, { order }] = await Promise.all([getSellerDashboard(), getSellerOrder(orderId)]);
  if (seller.status !== "active") redirect("/vendeur/statut");

  return (
    <SellerShell seller={seller} store={store} activePage="orders">
      <Link href="/vendeur/dashboard/commandes" className="text-sm font-semibold text-orivfide-red">← Toutes les commandes</Link>
      {query.statut === "modifie" && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Le statut a été mis à jour.</p>}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Sous-commande</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">{order.publicNumber}</h1>
          <p className="mt-2 text-sm text-orivfide-muted">Client : {order.customerName}</p>
        </div>
        <span className="rounded-full bg-[#fbebed] px-3 py-1 text-sm font-semibold text-orivfide-red">{statusLabels[order.status] ?? order.status}</span>
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="font-serif text-xl font-bold">Articles</h2>
        <div className="mt-4 divide-y divide-black/5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 py-4 text-sm">
              <div><p className="font-semibold">{item.productName}</p><p className="mt-1 text-xs text-orivfide-muted">{item.variantLabel}{item.sku ? ` · ${item.sku}` : ""}</p></div>
              <div className="text-right"><p>{item.quantity} × {item.unitPriceXaf.toLocaleString("fr-FR")} XAF</p><p className="mt-1 font-semibold">{item.lineTotalXaf.toLocaleString("fr-FR")} XAF</p></div>
            </div>
          ))}
        </div>
      </section>

      {(nextStatuses[order.status]?.length ?? 0) > 0 && (
        <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
          <h2 className="font-serif text-xl font-bold">Faire avancer la commande</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {nextStatuses[order.status].map((status) => (
              <form key={status} action={updateSellerOrderStatus} className="rounded-xl border border-black/5 p-3">
                <input type="hidden" name="sellerOrderId" value={order.id} />
                <input type="hidden" name="status" value={status} />
                <label className="grid gap-1 text-xs font-semibold">Motif
                  <input name="reason" required minLength={3} maxLength={500} className="rounded-lg border border-black/10 px-3 py-2 text-sm font-normal" placeholder="Précisez la mise à jour" />
                </label>
                <button type="submit" className="mt-3 rounded-lg bg-orivfide-red px-4 py-2 text-sm font-semibold text-white">{statusLabels[status]}</button>
              </form>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5">
        <h2 className="font-serif text-xl font-bold">Historique</h2>
        <div className="mt-4 grid gap-3">
          {order.events.map((event) => <div key={event.id} className="rounded-xl bg-[#faf7f6] p-4 text-sm"><p className="font-semibold">{statusLabels[event.newStatus] ?? event.newStatus}</p><p className="mt-1 text-xs text-orivfide-muted">{event.reason}</p><p className="mt-1 text-xs text-orivfide-muted">{new Date(event.createdAt).toLocaleString("fr-FR")}</p></div>)}
        </div>
      </section>
    </SellerShell>
  );
}
