import {
  ArrowRight,
  Globe2,
  HeartHandshake,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { MarketProductCarousel } from "@/components/MarketProductCarousel";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { PlatformFooter } from "@/components/PlatformFooter";
import { markets } from "@/data/markets";

const audience = [
  {
    icon: ShoppingBag,
    title: "Acheteurs",
    text: "Un point de départ pour découvrir des produits dans plusieurs univers.",
  },
  {
    icon: Store,
    title: "Revendeurs",
    text: "Une offre pensée aussi pour les professionnels qui recherchent des produits à revendre.",
  },
  {
    icon: Package,
    title: "Fournisseurs",
    text: "Un espace conçu pour présenter des produits et les faire connaître à différents publics.",
  },
];

const values = [
  {
    icon: ShoppingBag,
    title: "Plusieurs univers",
    text: "Mode, électronique, maison et d’autres catégories réunies dans une même vision.",
  },
  {
    icon: Users,
    title: "Des publics complémentaires",
    text: "Acheteurs, revendeurs et fournisseurs ont chacun leur place dans le concept ORIVFIDE.",
  },
  {
    icon: Globe2,
    title: "Une vision camerounaise",
    text: "Une marketplace imaginée pour rapprocher les acteurs du commerce au Cameroun.",
  },
  {
    icon: HeartHandshake,
    title: "Une approche claire",
    text: "Les informations sur les produits et les conditions de service devront être communiquées de façon transparente.",
  },
];

export default function PresentationPage() {
  return (
    <main className="min-h-screen bg-white text-foreground">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/95 px-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6">
          <Link href="/" aria-label="ORIVFIDE, accueil">
            <OrivfideLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a className="transition hover:text-orivfide-red" href="#concept">
              Le concept
            </a>
            <a className="transition hover:text-orivfide-red" href="#offre">
              Les marchés
            </a>
            <a className="transition hover:text-orivfide-red" href="#publics">
              Pour qui ?
            </a>
            <Link className="transition hover:text-orivfide-red" href="/vendeur/inscription">
              Espace vendeur
            </Link>
          </nav>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-orivfide-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-orivfide-red-dark"
            href="/accueil"
          >
            Commencer <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-orivfide-red-dark px-5 py-24 text-white sm:px-8 lg:py-32">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-white/5" />
        <RevealOnScroll className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            ORIVFIDE · Le commerce, à votre façon
          </p>
          <div className="mt-6 grid items-end gap-12 lg:grid-cols-[1fr_auto]">
            <div className="max-w-3xl">
              <h1 className="font-serif text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                Le marché, en un seul endroit.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                ORIVFIDE est un projet de marketplace imaginé pour rapprocher
                acheteurs, revendeurs et fournisseurs autour de plusieurs univers
                de produits.
              </p>
              <a
                className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-orivfide-red transition hover:bg-rose-50"
                href="#offre"
              >
                Découvrir les marchés <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/vendeur/inscription"
              >
                Créer ma boutique <Store className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-5 border-t border-white/20 pt-6 lg:min-w-[350px] lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              {[
                { value: "7", label: "univers de produits" },
                { value: "3", label: "profils concernés" },
                { value: "1", label: "même vision" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="font-serif text-3xl font-bold sm:text-4xl">{value}</p>
                  <p className="mt-2 text-xs leading-5 text-white/70 sm:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <RevealOnScroll>
        <section id="concept" className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
                Le concept
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-4xl">
                Une marketplace pensée pour connecter le commerce.
              </h2>
            </div>
            <div className="space-y-5 text-base leading-8 text-orivfide-muted">
              <p>
                ORIVFIDE a pour ambition de réunir des produits de différentes
                catégories et de créer un espace commun pour les personnes qui
                achètent, revendent ou fournissent.
              </p>
              <p>
                Cette page présente le concept et les univers envisagés. Elle ne
                constitue pas un catalogue de produits disponibles à la commande.
              </p>
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section id="offre" className="bg-zinc-50 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
                Les marchés
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
                Sept univers, une seule plateforme.
              </h2>
              <p className="mt-4 text-base leading-7 text-orivfide-muted">
                Voici les catégories envisagées pour l’offre ORIVFIDE.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {markets.map(({ label, icon: Icon, slides }) => (
                <article key={label} className="market-card rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-3 px-1">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orivfide-red text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-serif text-lg font-bold">{label}</h3>
                  </div>
                  <MarketProductCarousel market={label} slides={slides} />
                </article>
              ))}
              <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orivfide-red/30 p-6 text-center">
                <span className="font-serif text-3xl font-bold text-orivfide-red">+</span>
                <span className="mt-2 font-serif text-lg font-bold text-orivfide-red">
                  D’autres univers pourront s’ajouter
                </span>
                <p className="mt-2 text-sm leading-relaxed text-orivfide-muted">
                  Les catégories évolueront avec l’offre de la marketplace.
                </p>
              </div>
            </div>
            <p className="mt-6 text-center text-xs leading-5 text-orivfide-muted">
              Les photos sont illustratives et ne représentent pas un catalogue de
              produits actuellement disponibles à la vente.
            </p>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section id="publics" className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
                Pour qui ?
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
                Un espace imaginé pour plusieurs acteurs.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {audience.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl bg-orivfide-card p-7 transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orivfide-red text-white">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-serif text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-orivfide-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section className="bg-orivfide-red px-5 py-20 text-white sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Notre approche
              </p>
              <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">
                Une vision du commerce simple et inclusive.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-2xl bg-white/10 p-6">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/75">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <PlatformFooter />
    </main>
  );
}
