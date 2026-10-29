import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSellerDashboard, getSellerOrders } from "@/lib/seller-api";
import { SellerShell } from "../SellerShell";

export const metadata = { title: "Commandes vendeur | ORIVFIDE", robots: { index: false, follow: false } };
export const instant = false;

const statusLabels: Record<string, string> = {
  awaiting_vendor_confirmation: "En attente de confirmation",
  confirmed: "Confirmée",
  preparing: "Préparation",
  handed_to_carrier: "Remise au transporteur",
  in_transit: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  delivery_failed: "Échec de livraison",
  returned: "Retournée",
  disputed: "Litige",
};

export default async function SellerOrdersPage() {
  await connection();
  const [{ seller, store }, { orders }] = await Promise.all([getSellerDashboard(), getSellerOrders()]);
  if (seller.status !== "active") redirect("/vendeur/statut");

  return (
    <SellerShell seller={seller} store={store} activePage="orders">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Gestion des ventes</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Commandes</h1>
        <p className="mt-2 text-sm text-orivfide-muted">Suivez les sous-commandes attribuées à votre boutique.</p>
      </div>
      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center text-sm text-orivfide-muted">
            Aucune commande pour le moment.
          </div>
        ) : orders.map((order) => (
          <Link key={order.id} href={`/vendeur/dashboard/commandes/${order.id}`} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-orivfide-red/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Commande {order.publicNumber}</p>
                <p className="mt-1 text-xs text-orivfide-muted">{new Date(order.createdAt).toLocaleString("fr-FR")}</p>
              </div>
              <span className="rounded-full bg-[#fbebed] px-3 py-1 text-xs font-semibold text-orivfide-red">
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold">{order.subtotalXaf.toLocaleString("fr-FR")} XAF</p>
          </Link>
        ))}
      </div>
    </SellerShell>
  );
}
