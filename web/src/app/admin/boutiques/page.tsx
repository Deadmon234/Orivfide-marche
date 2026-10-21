import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ShieldCheck, Store } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { getAdminOverview, getAdminStores, SellerApiError } from "@/lib/seller-api";
import { StoreManagement } from "./StoreManagement";

export const metadata = {
  title: "Gestion des boutiques | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminStoresPage() {
  await connection();
  let stores;
  let overview;
  try {
    [{ stores }, { overview }] = await Promise.all([getAdminStores(), getAdminOverview()]);
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/admin/connexion");
    throw error;
  }

  return (
    <AdminShell pendingCount={overview.pendingSellers} section="stores">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
            <Store className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Supervision de la marketplace</p>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Gestion des boutiques</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-orivfide-muted">
          Consultez les vitrines, leurs responsables et leur catalogue. Vous pouvez retirer une boutique du public ou publier une boutique déjà approuvée.
        </p>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          Une boutique privée n’est plus accessible aux clients. Aucun compte, produit ou contenu n’est supprimé.
        </div>
        <StoreManagement stores={stores} />
      </div>
    </AdminShell>
  );
}
