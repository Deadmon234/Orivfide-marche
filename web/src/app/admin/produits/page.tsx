import { connection } from "next/server";
import { redirect } from "next/navigation";
import { PackageSearch, ShieldCheck } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { getAdminOverview, getAdminProducts, SellerApiError } from "@/lib/seller-api";
import { ProductModeration } from "./ProductModeration";

export const metadata = {
  title: "Modération du catalogue | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminProductsPage() {
  await connection();
  let products;
  let overview;
  try {
    [{ products }, { overview }] = await Promise.all([
      getAdminProducts(),
      getAdminOverview(),
    ]);
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/admin/connexion");
    throw error;
  }

  return (
    <AdminShell pendingCount={overview.pendingSellers} section="products">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
            <PackageSearch className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Supervision de la marketplace</p>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Catalogue produits</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-orivfide-muted">
          Consultez les fiches récemment créées et masquez un produit si nécessaire. Un produit masqué n’est plus visible par les clients; le vendeur conserve sa fiche et peut la modifier.
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          Les actions de modération ne suppriment pas les données ni les photos.
        </div>
        <ProductModeration products={products} />
      </div>
    </AdminShell>
  );
}
