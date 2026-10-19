import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Globe2,
  Package,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { PlatformFooter } from "@/components/PlatformFooter";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { markets } from "@/data/markets";

const productHighlights = [
  markets[0],
  markets[1],
  markets[3],
  markets[6],
];

export const metadata: Metadata = {
  title: "ORIVFIDE — Le commerce, à votre façon",
  description:
    "Découvrez le projet ORIVFIDE, une marketplace imaginée pour réunir acheteurs, revendeurs et fournisseurs autour de sept univers de produits.",
};

export default function AccueilPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/accueil" aria-label="ORIVFIDE — accueil">
            <OrivfideLogo priority />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-8 md:flex">
            <a className="home-nav-link" href="#univers">
              Nos univers
            </a>
            <a className="home-nav-link" href="#acteurs">
              Pour chacun
            </a>
            <a className="home-nav-link" href="#vision">
              Notre vision
            </a>
          </nav>
          <Link className="home-nav-cta" href="/#offre">
            Explorer ORIVFIDE <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </header>

      <section className="home-hero relative flex min-h-[740px] items-center px-5 pb-20 pt-32 sm:px-8 lg:min-h-[780px]">
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.94fr] lg:gap-12">
          <div className="home-hero-copy">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-orivfide-red/15 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-orivfide-red">
              <span className="h-2 w-2 rounded-full bg-orivfide-red" />
              Le commerce, à votre façon
            </p>
            <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[1.08] tracking-tight text-[#241518] sm:text-6xl lg:text-[4.4rem]">
              Le marché s&apos;ouvre à <span className="text-orivfide-red">vous.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#65595a]">
              Découvrez le projet ORIVFIDE : une marketplace imaginée pour rapprocher
              acheteurs, revendeurs et fournisseurs dans un même espace.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a className="home-button-primary" href="#univers">
                Découvrir les univers <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a className="home-button-secondary" href="#acteurs">
                Comment ça fonctionne ?
              </a>
            </div>
            <div className="mt-10 flex items-center gap-3 text-sm text-[#706566]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-orivfide-red shadow-sm">
                <Globe2 aria-hidden="true" size={18} />
              </span>
              Une ambition née au Cameroun, tournée vers tous
            </div>
            <p className="mt-4 max-w-xl text-xs leading-5 text-[#706566]">
              Cette page présente le concept : le catalogue et la commande en ligne
              ne sont pas encore proposés sur ce site.
            </p>
          </div>

          <div className="home-hero-gallery" aria-label="Aperçu des univers de produits ORIVFIDE">
            <div className="home-gallery-main">
              <Image
                src="/markets/fashion-shopping.jpg"
                alt="Univers mode et habillement"
                fill
                priority
                sizes="(max-width: 1023px) 90vw, 42vw"
                className="object-cover"
              />
              <span className="home-image-label">Mode & style</span>
            </div>
            <div className="home-gallery-side">
              <div className="home-gallery-small">
                <Image
                  src="/markets/electronics-phone.jpg"
                  alt="Téléphone dans l'univers électronique"
                  fill
                  sizes="(max-width: 1023px) 40vw, 18vw"
                  className="object-cover"
                />
                <span className="home-image-label">Électronique</span>
              </div>
              <div className="home-gallery-small">
                <Image
                  src="/markets/beauty-cosmetics.jpg"
                  alt="Produits de maquillage et cosmétiques"
                  fill
                  sizes="(max-width: 1023px) 40vw, 18vw"
                  className="object-cover"
                />
                <span className="home-image-label">Cosmétique</span>
              </div>
            </div>
            <div className="home-gallery-stamp">
              <span className="font-serif text-3xl font-bold">7</span>
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider">
                univers à<br />découvrir
              </span>
            </div>
          </div>
        </div>
        <a className="home-scroll-hint" href="#chiffres" aria-label="Faire défiler vers la suite">
          <ArrowDown aria-hidden="true" size={18} />
        </a>
      </section>

      <RevealOnScroll>
        <section id="chiffres" className="home-facts-section px-5 py-12 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_60px_rgba(40,14,19,0.06)] sm:grid-cols-3 sm:p-8">
            {[
              { value: "7", label: "univers de produits", icon: Package },
              { value: "3", label: "profils réunis", icon: Users },
              { value: "1", label: "même plateforme", icon: ShoppingBag },
            ].map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-4 border-black/5 px-4 py-5 sm:border-r sm:last:border-r-0"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fbebed] text-orivfide-red">
                  <Icon aria-hidden="true" size={22} />
                </span>
                <div>
                  <p className="font-serif text-3xl font-bold text-[#241518]">{value}</p>
                  <p className="mt-0.5 text-sm text-[#706566]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section id="acteurs" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="home-eyebrow">Un espace, plusieurs façons d&apos;avancer</p>
              <h2 className="home-section-title">Le commerce est plus fort quand on le connecte.</h2>
              <p className="mt-5 text-base leading-7 text-[#706566]">
                ORIVFIDE rapproche les personnes qui vendent, celles qui se
                réapprovisionnent et celles qui recherchent leur prochain achat.
              </p>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                {
                  title: "Vous achetez",
                  text: "Explorez plusieurs univers et découvrez des produits proposés par des vendeurs réunis sur une même plateforme.",
                  icon: ShoppingBag,
                  tag: "Pour les acheteurs",
                },
                {
                  title: "Vous revendez",
                  text: "Trouvez un espace pour repérer des produits et développer votre activité de revendeur.",
                  icon: Store,
                  tag: "Pour les revendeurs",
                },
                {
                  title: "Vous fournissez",
                  text: "Présentez votre catalogue et faites découvrir vos produits à de nouveaux publics.",
                  icon: Package,
                  tag: "Pour les fournisseurs",
                },
              ].map(({ title, text, icon: Icon, tag }, index) => (
                <article
                  key={title}
                  className={`home-actor-card ${index === 1 ? "home-actor-card-highlight" : ""}`}
                >
                  <span className="home-actor-icon">
                    <Icon aria-hidden="true" size={23} />
                  </span>
                  <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                    {tag}
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 opacity-75">{text}</p>
                  <Link className="home-text-link mt-6" href="/#concept">
                    En savoir plus <ArrowRight aria-hidden="true" size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section id="univers" className="bg-[#faf7f6] px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="home-eyebrow">Une seule destination</p>
                <h2 className="home-section-title">Sept univers. De nouvelles découvertes.</h2>
                <p className="mt-4 text-base leading-7 text-[#706566]">
                  De la technologie au quotidien, découvrez les catégories envisagées
                  pour l’offre ORIVFIDE.
                </p>
              </div>
              <Link className="home-text-link shrink-0" href="/#offre">
                Voir tous les univers <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {productHighlights.map(({ label, slides }) => (
                <Link
                  href="/#offre"
                  key={label}
                  className="home-category-card group"
                  aria-label={`Découvrir l'univers ${label}`}
                >
                  <div className="home-category-image">
                    <Image
                      src={slides[0].src}
                      alt={slides[0].label}
                      fill
                      sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 24vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="home-category-arrow">
                      <ArrowUpRight aria-hidden="true" size={17} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-4">
                    <h3 className="font-serif text-lg font-bold">{label}</h3>
                    <ArrowRight
                      aria-hidden="true"
                      size={17}
                      className="text-orivfide-red transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-center text-xs leading-5 text-[#706566]">
              Les images sont illustratives et ne représentent pas des produits actuellement
              disponibles à la vente.
            </p>
          </div>
        </section>
      </RevealOnScroll>

      <RevealOnScroll>
        <section id="vision" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="home-vision-panel mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] px-7 py-12 sm:px-12 lg:grid-cols-[1fr_auto] lg:px-16 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                ORIVFIDE — Le marché, en un seul endroit
              </p>
              <h2 className="mt-5 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                Une nouvelle façon de faire circuler les idées, les produits et les opportunités.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
                Une plateforme conçue pour rapprocher les acteurs du commerce et
                rendre la découverte de produits plus simple.
              </p>
            </div>
            <Link className="home-button-light" href="/#offre">
              Explorer la plateforme <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <div className="home-vision-watermark" aria-hidden="true">
              <BadgeCheck size={220} strokeWidth={0.6} />
            </div>
          </div>
        </section>
      </RevealOnScroll>

      <PlatformFooter />
    </main>
  );
}
