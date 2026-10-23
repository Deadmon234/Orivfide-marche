import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { getSellerDashboard } from "@/lib/seller-api";
import { StoreSettingsForm } from "../StoreSettingsForm";
import { SellerShell } from "../SellerShell";

export const metadata = {
  title: "Ma boutique | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerStorePage({
  searchParams,
}: {
  searchParams: Promise<{ boutique?: string }>;
}) {
  await connection();
  const { seller, store } = await getSellerDashboard();
  if (seller.status !== "active") redirect("/vendeur/statut");
  const params = await searchParams;

  return (
    <SellerShell seller={seller} store={store} activePage="store">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Vitrine vendeur</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Ma boutique</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">
          Gérez les coordonnées et la présentation visibles par vos clients.
        </p>
      </div>
      {params.boutique === "modifiee" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Les informations de la boutique ont été mises à jour.
        </p>
      )}

      <section className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-serif text-2xl font-bold">{store.name}</h2>
            <p className="mt-2 text-sm text-orivfide-muted">{store.category}</p>
            <p className="mt-2 text-xs text-orivfide-muted">
              Adresse publique :{" "}
              <Link className="font-medium text-orivfide-red underline" href={`/boutique/${store.slug}`}>
                /boutique/{store.slug}
              </Link>
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Boutique active
          </span>
        </div>
        <Link href={`/boutique/${store.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Voir ma vitrine publique
        </Link>
        <StoreSettingsForm store={store} />
      </section>
    </SellerShell>
  );
}
