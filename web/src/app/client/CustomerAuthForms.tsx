"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerCustomer, signInCustomer } from "@/app/client/actions";

const initialState = { message: "", success: false };

export function CustomerRegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, initialState);
  return (
    <form action={action} className="grid gap-4">
      <label className="seller-field">
        Nom complet
        <input name="fullName" autoComplete="name" required minLength={2} maxLength={120} />
      </label>
      <label className="seller-field">
        Adresse e-mail
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label className="seller-field">
        Mot de passe
        <input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <span className="text-xs font-normal text-orivfide-muted">10 caractères minimum</span>
      </label>
      {state.message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Création…" : "Créer mon compte"}
      </button>
      <p className="text-center text-sm text-orivfide-muted">
        Déjà inscrit ? <Link className="font-semibold text-orivfide-red" href="/client/connexion">Se connecter</Link>
      </p>
    </form>
  );
}

export function CustomerLoginForm() {
  const [state, action, pending] = useActionState(signInCustomer, initialState);
  return (
    <form action={action} className="grid gap-4">
      <label className="seller-field">
        Adresse e-mail
        <input name="email" type="email" autoComplete="email" required maxLength={254} />
      </label>
      <label className="seller-field">
        Mot de passe
        <input name="password" type="password" autoComplete="current-password" required minLength={10} maxLength={72} />
      </label>
      {state.message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-center text-sm text-orivfide-muted">
        Pas encore de compte ? <Link className="font-semibold text-orivfide-red" href="/client/inscription">Créer un compte</Link>
      </p>
    </form>
  );
}
