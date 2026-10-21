"use client";

import { useActionState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { signInAdmin } from "@/app/admin/actions";
import { OrivfideLogo } from "@/components/OrivfideLogo";

const initialState = { message: "" };

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(signInAdmin, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f6] px-5 py-10">
      <section className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-[0_18px_60px_rgba(40,14,19,0.08)] sm:p-10">
        <Link href="/accueil" aria-label="Retour à l’accueil ORIVFIDE">
          <OrivfideLogo />
        </Link>
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">
          Accès sécurisé
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold">Administration ORIVFIDE</h1>
        <p className="mt-3 text-sm leading-6 text-orivfide-muted">
          Connectez-vous pour examiner et valider les demandes d’ouverture de boutique.
        </p>
        <form action={formAction} className="mt-7 space-y-5">
          <label className="seller-field">
            Clé administrateur
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orivfide-muted" aria-hidden="true" />
              <input className="!pl-11" type="password" name="adminKey" required minLength={32} autoComplete="current-password" />
            </span>
          </label>
          {state.message && (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {state.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-orivfide-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Vérification…" : "Accéder à l’administration"}
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-orivfide-muted">
          Cette clé doit être conservée confidentielle et configurée dans les variables du service backend.
        </p>
      </section>
    </main>
  );
}
