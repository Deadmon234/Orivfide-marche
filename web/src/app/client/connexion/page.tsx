import Link from "next/link";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { CustomerLoginForm } from "../CustomerAuthForms";

export const metadata = {
  title: "Connexion client | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ inscription?: string; retour?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f6] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/accueil" aria-label="Retour à l’accueil"><OrivfideLogo /></Link>
        <h1 className="mt-8 font-serif text-3xl font-bold">Connexion client</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">Connectez-vous pour retrouver votre panier.</p>
        {params.inscription === "ok" && (
          <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Si le compte pouvait être créé, vous pouvez maintenant vous connecter.
          </p>
        )}
        {params.retour === "panier" && (
          <p role="status" className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Connectez-vous pour ajouter un article à votre panier.
          </p>
        )}
        <div className="mt-7"><CustomerLoginForm /></div>
      </section>
    </main>
  );
}
