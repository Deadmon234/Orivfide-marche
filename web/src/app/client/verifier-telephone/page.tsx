import Link from "next/link";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import {
  CustomerPhoneCodeForm,
  CustomerPhoneStartForm,
} from "@/app/client/CustomerAuthForms";
import { customerTokenCookieName } from "@/lib/seller-api";

export const metadata = {
  title: "Vérifier mon numéro | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function VerifyCustomerPhonePage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string; challengeId?: string }>;
}) {
  await connection();
  const params = await searchParams;
  const flow = params.flow === "account" ? "account" : "registration";
  const challengeId = params.challengeId;

  if (flow === "account" && !(await cookies()).get(customerTokenCookieName)?.value) {
    redirect("/client/connexion?retour=verifier-telephone");
  }
  if (flow === "registration" && !challengeId) redirect("/client/inscription");
  if (challengeId && !/^[0-9a-f-]{36}$/i.test(challengeId)) {
    redirect(flow === "account" ? "/client/verifier-telephone?flow=account" : "/client/inscription");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f6] px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-sm sm:p-9">
        <Link href="/accueil" aria-label="Retour à l’accueil"><OrivfideLogo /></Link>
        <h1 className="mt-8 font-serif text-3xl font-bold">Vérifier votre numéro</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">
          {challengeId
            ? "Saisissez le code à six chiffres envoyé dans WhatsApp. Il expire après cinq minutes."
            : "Vérifiez votre numéro WhatsApp pour sécuriser votre compte et accéder à votre panier."}
        </p>
        <div className="mt-7">
          {challengeId
            ? <CustomerPhoneCodeForm challengeId={challengeId} flow={flow} />
            : <CustomerPhoneStartForm />}
        </div>
        <p className="mt-6 text-center text-sm text-orivfide-muted">
          Besoin d’aide ? <Link className="font-semibold text-orivfide-red" href="/client/connexion">Retour à la connexion</Link>
        </p>
      </section>
    </main>
  );
}
