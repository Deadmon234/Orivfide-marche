import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Check, LogOut, ShieldCheck, Store, X } from "lucide-react";
import { getAdminSellers, SellerApiError } from "@/lib/seller-api";
import { approveSeller, rejectSeller, signOutAdmin } from "@/app/admin/actions";

export const metadata = {
  title: "Validation des vendeurs | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function AdminSellersPage() {
  await connection();
  let sellers;
  try {
    ({ sellers } = await getAdminSellers());
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/admin/connexion");
    throw error;
  }

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="font-serif text-2xl font-bold text-orivfide-red">ORIVFIDE</p>
            <p className="mt-1 text-xs text-orivfide-muted">Administration · validation des vendeurs</p>
          </div>
          <form action={signOutAdmin}>
            <button className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/[0.03]">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Espace administrateur</p>
            <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">Demandes de boutiques</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-orivfide-muted">
          Examinez les informations du vendeur et de sa boutique. Une approbation active son compte et publie sa vitrine.
        </p>

        {sellers.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white px-5 py-16 text-center">
            <Store className="mx-auto h-8 w-8 text-orivfide-red" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-xl font-bold">Aucune demande à examiner</h2>
            <p className="mt-2 text-sm text-orivfide-muted">Les nouvelles inscriptions apparaîtront ici.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {sellers.map((seller) => (
              <article key={seller.id} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-2xl font-bold">{seller.store.name}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.status === "rejected" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>
                        {seller.status === "rejected" ? "Refusée · à réexaminer" : "En attente"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-orivfide-muted">{seller.store.category} · demande du {new Date(seller.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-4 rounded-xl bg-[#faf7f6] p-4 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-orivfide-muted">Responsable</dt><dd className="mt-1 font-semibold">{seller.fullName}</dd></div>
                  <div><dt className="text-xs text-orivfide-muted">E-mail</dt><dd className="mt-1 font-semibold"><a className="underline" href={`mailto:${seller.email}`}>{seller.email}</a></dd></div>
                  <div><dt className="text-xs text-orivfide-muted">Téléphone</dt><dd className="mt-1 font-semibold"><a className="underline" href={`tel:${seller.store.phone}`}>{seller.store.phone}</a></dd></div>
                  {seller.rejectionReason && <div><dt className="text-xs text-orivfide-muted">Motif du refus précédent</dt><dd className="mt-1">{seller.rejectionReason}</dd></div>}
                </dl>

                <div className="mt-5 flex flex-col gap-4 border-t border-black/5 pt-5 sm:flex-row sm:items-end sm:justify-between">
                  <form action={rejectSeller} className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <input type="hidden" name="sellerId" value={seller.id} />
                    <label className="seller-field flex-1">
                      Motif si vous refusez
                      <input name="reason" minLength={5} maxLength={1000} required placeholder="Expliquez les éléments à corriger" />
                    </label>
                    <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-200 px-5 text-sm font-semibold text-rose-800 hover:bg-rose-50">
                      <X className="h-4 w-4" aria-hidden="true" /> Refuser
                    </button>
                  </form>
                  <form action={approveSeller}>
                    <input type="hidden" name="sellerId" value={seller.id} />
                    <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto">
                      <Check className="h-4 w-4" aria-hidden="true" /> Approuver la boutique
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
