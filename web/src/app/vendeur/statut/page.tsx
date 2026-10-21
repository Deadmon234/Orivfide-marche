import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Clock3, ShieldCheck, Store, XCircle } from "lucide-react";
import { getSellerDashboard } from "@/lib/seller-api";
import { signOutSeller } from "@/app/vendeur/actions";

export const metadata = {
  title: "État de la demande vendeur | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerStatusPage() {
  await connection();
  const { seller, store } = await getSellerDashboard();
  if (seller.status === "active") redirect("/vendeur/dashboard");

  const rejected = seller.status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f6] px-5 py-10">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(40,14,19,0.08)] sm:p-10">
        <Link href="/accueil" className="font-serif text-2xl font-bold tracking-wide text-orivfide-red">
          ORIVFIDE
        </Link>
        <div className={`mt-8 flex h-14 w-14 items-center justify-center rounded-2xl ${rejected ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
          {rejected
            ? <XCircle className="h-7 w-7" aria-hidden="true" />
            : <Clock3 className="h-7 w-7" aria-hidden="true" />}
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">
          Espace vendeur
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
          {rejected ? "Votre demande nécessite une mise à jour" : "Votre demande est en cours d’examen"}
        </h1>
        <p className="mt-4 text-sm leading-7 text-orivfide-muted">
          {rejected
            ? "L’équipe ORIVFIDE n’a pas pu valider votre compte ou votre boutique pour le moment. Consultez le motif ci-dessous puis contactez ORIVFIDE pour connaître les prochaines étapes."
            : "Votre compte et les informations de votre boutique ont bien été reçus. L’équipe ORIVFIDE les vérifiera avant d’activer votre espace vendeur et de rendre votre boutique visible."}
        </p>

        <div className="mt-7 rounded-2xl border border-black/5 bg-[#faf7f6] p-5">
          <div className="flex items-center gap-3">
            {rejected
              ? <XCircle className="h-5 w-5 text-rose-700" aria-hidden="true" />
              : <Store className="h-5 w-5 text-orivfide-red" aria-hidden="true" />}
            <div>
              <p className="font-semibold">{store.name}</p>
              <p className="mt-1 text-sm text-orivfide-muted">{store.category}</p>
            </div>
          </div>
          {rejected && seller.rejectionReason && (
            <p className="mt-4 border-t border-black/5 pt-4 text-sm leading-6 text-orivfide-muted">
              <strong className="text-foreground">Motif communiqué :</strong> {seller.rejectionReason}
            </p>
          )}
        </div>

        {!rejected && (
          <p className="mt-6 flex gap-2 text-sm leading-6 text-orivfide-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            Votre vitrine n’est pas publique pendant l’examen. Vous pourrez gérer votre boutique après validation.
          </p>
        )}

        <form action={signOutSeller} className="mt-8">
          <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:bg-black/[0.03]">
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
}
