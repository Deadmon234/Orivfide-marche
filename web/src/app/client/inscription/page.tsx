import Link from "next/link";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { CustomerRegisterForm } from "../CustomerAuthForms";

export const metadata = {
  title: "Créer un compte client | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default function CustomerRegistrationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f6] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/accueil" aria-label="Retour à l’accueil"><OrivfideLogo /></Link>
        <h1 className="mt-8 font-serif text-3xl font-bold">Créer votre compte</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">
          Votre compte vous permettra de retrouver votre panier et de suivre vos commandes lorsqu’elles seront disponibles.
        </p>
        <p className="mt-3 rounded-xl bg-[#faf7f6] px-4 py-3 text-sm leading-6 text-orivfide-muted">
          Une adresse e-mail ne peut être associée qu’à un seul compte. Si vous avez déjà un compte, connectez-vous avec votre adresse e-mail et votre mot de passe.
        </p>
        <div className="mt-7"><CustomerRegisterForm /></div>
      </section>
    </main>
  );
}
