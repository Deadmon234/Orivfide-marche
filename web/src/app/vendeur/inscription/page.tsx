"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  LockKeyhole,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { SellerAuthLayout } from "@/components/SellerAuthLayout";
import { registerSeller } from "@/app/vendeur/actions";
import { markets } from "@/data/markets";

const initialState = { message: "", success: false };

export default function SellerRegistrationPage() {
  const [state, formAction, pending] = useActionState(registerSeller, initialState);

  return (
    <SellerAuthLayout variant="register">
      <div className="seller-auth-heading">
        <span className="seller-auth-step">ESPACE VENDEUR <span /> ÉTAPE 1 SUR 2</span>
        <h1>Créez votre boutique</h1>
        <p>Un compte pour vous, une vitrine pour vos produits. Commençons par les informations essentielles.</p>
      </div>

      <form action={formAction} className="seller-auth-form">
        <div className="seller-form-section">
          <div className="seller-form-section-title">
            <span>01</span>
            <div>
              <h2>Vos informations</h2>
              <p>Les coordonnées du responsable du compte.</p>
            </div>
          </div>

          <label className="seller-auth-field">
            <span>Nom complet</span>
            <span className="seller-auth-input-wrap">
              <UserRound className="seller-auth-input-icon" aria-hidden="true" />
              <input autoComplete="name" name="fullName" placeholder="Ex. Christian Fotso" required minLength={2} maxLength={120} />
            </span>
          </label>

          <label className="seller-auth-field">
            <span>Adresse e-mail</span>
            <span className="seller-auth-input-wrap">
              <Mail className="seller-auth-input-icon" aria-hidden="true" />
              <input type="email" autoComplete="email" name="email" placeholder="vous@exemple.com" required maxLength={254} />
            </span>
          </label>

          <label className="seller-auth-field">
            <span>Mot de passe</span>
            <span className="seller-auth-input-wrap">
              <LockKeyhole className="seller-auth-input-icon" aria-hidden="true" />
              <input
                type="password"
                autoComplete="new-password"
                name="password"
                placeholder="10 caractères minimum"
                required
                minLength={10}
                maxLength={72}
                aria-describedby="seller-password-hint"
              />
            </span>
            <span id="seller-password-hint" className="seller-auth-field-hint">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Choisissez un mot de passe difficile à deviner.
            </span>
          </label>
        </div>

        <div className="seller-form-section">
          <div className="seller-form-section-title">
            <span>02</span>
            <div>
              <h2>Votre boutique</h2>
              <p>Ces informations présenteront votre activité.</p>
            </div>
          </div>

          <label className="seller-auth-field">
            <span>Nom de la boutique</span>
            <span className="seller-auth-input-wrap">
              <Store className="seller-auth-input-icon" aria-hidden="true" />
              <input name="storeName" placeholder="Ex. La Maison du Style" required minLength={2} maxLength={120} />
            </span>
          </label>

          <label className="seller-auth-field">
            <span>Catégorie principale</span>
            <span className="seller-auth-input-wrap">
              <Store className="seller-auth-input-icon" aria-hidden="true" />
              <select name="category" required defaultValue="">
                <option value="" disabled>Sélectionnez votre univers</option>
                {markets.map(({ label }) => <option key={label}>{label}</option>)}
              </select>
              <ChevronDown className="seller-auth-select-icon" aria-hidden="true" />
            </span>
          </label>

          <label className="seller-auth-field">
            <span>Téléphone de la boutique</span>
            <span className="seller-auth-input-wrap">
              <Phone className="seller-auth-input-icon" aria-hidden="true" />
              <input type="tel" name="phone" autoComplete="tel" placeholder="+237 6XX XXX XXX" required minLength={6} maxLength={32} />
            </span>
          </label>
        </div>

        {state.message && (
          <p role="alert" className="seller-auth-error">{state.message}</p>
        )}

        <button type="submit" disabled={pending} className="seller-auth-submit">
          {pending ? "Création de votre espace…" : "Créer mon compte et ma boutique"}
          {!pending && <ArrowRight className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />}
        </button>
      </form>

      <p className="seller-auth-switch">
        Vous avez déjà un compte ?{" "}
        <Link href="/vendeur/connexion">Connectez-vous</Link>
      </p>

      <p className="seller-auth-draft-note">
        <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Votre boutique sera présentée en <strong>mode test public</strong> après lecture du brouillon vendeur. Ce brouillon n’est pas le contrat définitif ORIVFIDE.</span>
      </p>
    </SellerAuthLayout>
  );
}
