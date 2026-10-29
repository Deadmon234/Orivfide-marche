import Link from "next/link";
import { ArrowLeft, PackageSearch, ShoppingBag } from "lucide-react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCustomerOrders, SellerApiError } from "@/lib/seller-api";

export const metadata = { title: "Mes commandes | ORIVFIDE", robots: { index: false, follow: false } };
export const instant = false;

const statusLabels: Record<string, string> = {
  awaiting_vendor_confirmation: "En attente du vendeur",
  confirmed: "Confirmée", preparing: "Préparation en cours",
  handed_to_carrier: "Remise au transporteur", in_transit: "En livraison",
  delivered: "Livrée", cancelled: "Annulée", delivery_failed: "Livraison échouée",
  returned: "Retournée", disputed: "Litige",
};

export default async function CustomerOrdersPage() {
  await connection();
  let result;
  try { result = await getCustomerOrders(); }
  catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/client/connexion?retour=commandes");
    throw error;
  }

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/accueil" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red"><ArrowLeft className="h-4 w-4" />Retour à l’accueil</Link>
          <Link href="/panier" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-muted hover:text-orivfide-red"><ShoppingBag className="h-4 w-4" />Mon panier</Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Espace client</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mes commandes</h1>
        <p className="mt-2 text-sm text-orivfide-muted">Suivez le statut de chaque commande confirmée.</p>
        {result.orders.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-black/5 bg-white px-5 py-14 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-orivfide-red" />
            <h2 className="mt-4 font-serif text-xl font-bold">Aucune commande</h2>
            <p className="mt-2 text-sm text-orivfide-muted">Vos commandes confirmées apparaîtront ici.</p>
            <Link href="/accueil" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white">Découvrir les boutiques</Link>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {result.orders.map((order) => (
              <Link key={order.id} href={`/commandes/${order.id}`} className="block rounded-2xl border border-black/5 bg-white p-5 transition hover:border-orivfide-red/30 hover:shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-orivfide-muted">{order.publicNumber}</p><p className="mt-2 font-serif text-xl font-bold">{new Intl.NumberFormat("fr-FR").format(order.subtotalXaf)} FCFA</p></div>
                  <span className="rounded-full bg-[#fbebed] px-3 py-1 text-xs font-semibold text-orivfide-red">{statusLabels[order.status] ?? order.status}</span>
                </div>
                <p className="mt-4 text-xs text-orivfide-muted">Passée le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.createdAt))}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
