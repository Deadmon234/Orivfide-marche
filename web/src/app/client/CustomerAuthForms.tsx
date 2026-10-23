"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  registerCustomer,
  signInCustomer,
  startCustomerPhoneVerification,
  verifyCustomerPhone,
  verifyCustomerRegistration,
} from "@/app/client/actions";

const initialState = { message: "", success: false };

export function CustomerRegisterForm() {
  const [state, action, pending] = useActionState(registerCustomer, initialState);
  const [showPassword, setShowPassword] = useState(false);
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
        Numéro WhatsApp camerounais
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+2376XXXXXXXX"
          pattern="\+237[0-9]{9}"
          required
        />
        <span className="text-xs font-normal text-orivfide-muted">Un code de vérification sera envoyé sur WhatsApp.</span>
      </label>
      <label className="seller-field">
        Mot de passe
        <span className="relative block">
          <input
            className="pr-12"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={72}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-lg text-orivfide-muted hover:text-orivfide-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-orivfide-red"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword
              ? <EyeOff className="h-5 w-5" aria-hidden="true" />
              : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        </span>
        <span className="text-xs font-normal text-orivfide-muted">10 caractères minimum</span>
      </label>
      <label className="flex items-start gap-3 text-sm leading-6 text-orivfide-muted">
        <input name="whatsappConsent" type="checkbox" required className="mt-1 accent-orivfide-red" />
        <span>J’accepte de recevoir sur WhatsApp le code nécessaire à la vérification de mon numéro.</span>
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

export function CustomerPhoneStartForm() {
  const [state, action, pending] = useActionState(startCustomerPhoneVerification, initialState);
  return (
    <form action={action} className="grid gap-4">
      <label className="seller-field">
        Numéro WhatsApp camerounais
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+2376XXXXXXXX"
          pattern="\+237[0-9]{9}"
          required
        />
      </label>
      <label className="flex items-start gap-3 text-sm leading-6 text-orivfide-muted">
        <input name="whatsappConsent" type="checkbox" required className="mt-1 accent-orivfide-red" />
        <span>J’accepte de recevoir sur WhatsApp le code nécessaire à la vérification de mon numéro.</span>
      </label>
      {state.message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer un code WhatsApp"}
      </button>
    </form>
  );
}

export function CustomerPhoneCodeForm({
  challengeId,
  flow,
}: {
  challengeId: string;
  flow: "registration" | "account";
}) {
  const actionForFlow = flow === "registration" ? verifyCustomerRegistration : verifyCustomerPhone;
  const [state, action, pending] = useActionState(actionForFlow, initialState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="challengeId" value={challengeId} />
      <label className="seller-field">
        Code reçu sur WhatsApp
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
      </label>
      {state.message && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Vérification…" : "Vérifier mon numéro"}
      </button>
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
