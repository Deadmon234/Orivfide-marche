"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowUp, Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { OrivfideLogo } from "@/components/OrivfideLogo";

export function PlatformFooter() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 400);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const backToTop = () => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
  };

  return (
    <>
      <footer className="bg-[#241014] px-5 py-14 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <OrivfideLogo variant="light" size="large" />
              <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
                Une vision du commerce qui rapproche acheteurs, revendeurs et
                fournisseurs autour de plusieurs univers de produits.
              </p>
              <p className="mt-5 text-xs leading-6 text-white/50">
                Cette page présente le concept ORIVFIDE. Le catalogue et les
                commandes en ligne ne sont pas encore disponibles sur ce site.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="grid gap-6">
                <div className="flex items-start gap-4">
                  <Image
                    src="/christian-fotso.png"
                    alt="Portrait de Christian Fotso, créateur d’ORIVFIDE"
                    width={96}
                    height={96}
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-white/20 object-cover"
                  />
                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                      Créateur
                    </p>
                    <h2 className="mt-2 font-serif text-xl font-bold">Christian Fotso</h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Développeur du projet ORIVFIDE.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Image
                    src="/responsable-marketing.jpeg"
                    alt="Portrait du responsable marketing d’ORIVFIDE"
                    width={96}
                    height={96}
                    className="h-20 w-20 shrink-0 rounded-full border-2 border-white/20 object-cover"
                  />
                  <div className="pt-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                      Responsable du projet et marketing ORIVFIDE
                    </p>
                    <h2 className="mt-2 font-serif text-xl font-bold">Larry</h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      Pilotage et coordination du projet.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                  Contact
                </h2>
                <div className="mt-4 grid gap-3">
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm text-white/75 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
                    href="tel:+237657506088"
                    aria-label="Appeler Christian Fotso au 657 506 088"
                  >
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>+237 657 506 088</span>
                  </a>
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm text-white/75 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
                    href="https://wa.me/237652236142"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Contacter sur WhatsApp au 652 236 142"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>WhatsApp · +237 652 236 142</span>
                  </a>
                  <a
                    className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 px-3 text-sm text-white/75 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
                    href="mailto:nexora.digital.se@gmail.com"
                  >
                    <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="break-all">nexora.digital.se@gmail.com</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>© ORIVFIDE · Le commerce, à votre façon.</p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <Link className="transition hover:text-white" href="/vendeur/inscription">
                Vendre sur ORIVFIDE
              </Link>
              <Link className="transition hover:text-white" href="/#concept">
                Découvrir le concept
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <button
        type="button"
        onClick={backToTop}
        aria-label="Remonter en haut de la page"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
        className={`back-to-top fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-orivfide-red text-white shadow-lg shadow-black/20 transition duration-200 hover:-translate-y-1 hover:bg-orivfide-red-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orivfide-red sm:bottom-8 sm:right-8 ${
          showBackToTop ? "visible translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0"
        }`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}
