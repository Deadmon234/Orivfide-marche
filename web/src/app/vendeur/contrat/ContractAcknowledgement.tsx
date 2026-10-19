"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, ShieldAlert } from "lucide-react";
import { acknowledgeDraftContract } from "@/app/vendeur/actions";
import { OrivfideLogo } from "@/components/OrivfideLogo";

const initialState = { message: "", success: false };

export function ContractAcknowledgement({
  sellerName,
  storeName,
}: {
  sellerName: string;
  storeName: string;
}) {
  const [state, formAction, pending] = useActionState(acknowledgeDraftContract, initialState);

  return (
    <main className="min-h-screen bg-[#faf7f6] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/accueil" aria-label="ORIVFIDE">
          <OrivfideLogo />
        </Link>
        <section className="mt-10 rounded-3xl bg-white p-6 shadow-[0_18px_60px_rgba(40,14,19,0.08)] sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">
            Étape préalable à l’espace vendeur
          </p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
            Projet de contrat vendeur
          </h1>
          <p className="mt-3 text-sm leading-7 text-orivfide-muted">
            Boutique concernée : <strong className="text-foreground">{storeName}</strong>
          </p>

          <div className="mt-7 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm leading-6">
              <strong>Brouillon non contractuel.</strong> Ce texte est un aperçu de travail,
              pas un contrat à signer. Les clauses commerciales, juridiques et de protection
              des consommateurs doivent être complétées et validées par ORIVFIDE et un conseil
              juridique avant toute signature définitive. La boutique restera privée.
            </p>
          </div>

          <div className="mt-7 space-y-5 rounded-2xl border border-black/5 bg-[#faf7f6] p-5 text-sm leading-7 sm:p-7">
            <h2 className="font-serif text-xl font-bold">Base de travail — conditions à finaliser</h2>
            <div>
              <h3 className="font-semibold">1. Parties et objet</h3>
              <p>
                Le présent projet vise à encadrer la mise en relation entre ORIVFIDE et
                le vendeur pour la présentation de sa boutique et de ses produits.
                L’identité juridique et les coordonnées complètes des parties restent à renseigner.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">2. Engagements du vendeur</h3>
              <p>
                Le vendeur décrit ses produits avec exactitude, détient les droits nécessaires
                pour les proposer et maintient à jour les informations, les prix et les
                disponibilités qu’il publie.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">3. Commandes, paiements et livraison</h3>
              <p>
                Les responsabilités des parties, les moyens et délais de paiement, la préparation
                des commandes, la livraison, les retours et le traitement des réclamations
                restent à définir avant la signature finale.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">4. Frais et rémunération</h3>
              <p>
                Les commissions, frais éventuels, modalités de facturation et calendrier de
                versement seront fixés dans une annexe validée par les deux parties.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">5. Durée, suspension et fin de relation</h3>
              <p>
                La durée, les conditions de renouvellement, les motifs de suspension ou de
                résiliation et le sort des commandes en cours doivent être complétés.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">6. Données, propriété intellectuelle et litiges</h3>
              <p>
                Les règles applicables aux données personnelles, aux marques et contenus,
                à la confidentialité et au règlement des différends doivent être rédigées et
                validées selon le droit applicable.
              </p>
            </div>
          </div>

          <form action={formAction} className="mt-7 space-y-5">
            <label className="seller-field">
              Nom complet du titulaire
              <input name="signerName" defaultValue={sellerName} required autoComplete="name" />
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-orivfide-muted">
              <input className="mt-1 h-4 w-4 accent-[#c41230]" type="checkbox" name="acknowledge" required />
              <span>
                Je confirme avoir lu ce <strong>brouillon non contractuel</strong> et souhaite
                accéder à mon tableau de bord pour préparer ma boutique. Je comprends qu’il
                ne s’agit pas d’une signature du contrat définitif.
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
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orivfide-red px-6 py-3 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Enregistrement…" : "Continuer vers mon tableau de bord"}
              {!pending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
