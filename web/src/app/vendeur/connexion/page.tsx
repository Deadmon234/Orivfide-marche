"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { SellerAuthLayout } from "@/components/SellerAuthLayout";
import { signInSeller } from "@/app/vendeur/actions";

const initialState = { message: "", success: false };

export default function SellerLoginPage() {
  const [state, formAction, pending] = useActionState(signInSeller, initialState);

  return (
    <SellerAuthLayout variant="login">
      <div className="seller-auth-heading">
        <span className="seller-auth-step">ESPACE VENDEUR <span /> CONNEXION</span>
        <h1>Bon retour parmi nous.</h1>
        <p>Connectez-vous pour retrouver votre boutique et continuer là où vous en étiez.</p>
      </div>

      <form action={formAction} className="seller-auth-form seller-login-form">
        <label className="seller-auth-field">
          <span>Adresse e-mail</span>
          <span className="seller-auth-input-wrap">
            <Mail className="seller-auth-input-icon" aria-hidden="true" />
            <input type="email" name="email" autoComplete="email" placeholder="vous@exemple.com" required maxLength={254} />
          </span>
        </label>

        <label className="seller-auth-field">
          <span>Mot de passe</span>
          <span className="seller-auth-input-wrap">
            <LockKeyhole className="seller-auth-input-icon" aria-hidden="true" />
            <input type="password" name="password" autoComplete="current-password" placeholder="Votre mot de passe" required maxLength={72} />
          </span>
        </label>

        {state.message && (
          <p role="alert" className="seller-auth-error">{state.message}</p>
        )}

        <button type="submit" disabled={pending} className="seller-auth-submit">
          {pending ? "Connexion en cours…" : "Me connecter"}
          {!pending && <ArrowRight className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />}
        </button>
      </form>

      <div className="seller-login-secure">
        <ShieldCheck className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
        <span>Connexion protégée · Vos identifiants restent confidentiels.</span>
      </div>

      <div className="seller-login-divider"><span>OU</span></div>
      <p className="seller-auth-switch">
        Vous découvrez ORIVFIDE ?{" "}
        <Link href="/vendeur/inscription">Créer ma boutique <ArrowRight aria-hidden="true" /></Link>
      </p>
    </SellerAuthLayout>
  );
}
