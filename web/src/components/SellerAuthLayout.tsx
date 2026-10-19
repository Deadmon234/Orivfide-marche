import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Package,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";

const highlights = [
  { icon: Store, text: "Créez votre vitrine en quelques étapes" },
  { icon: Package, text: "Présentez vos produits à votre rythme" },
  { icon: ShieldCheck, text: "Gardez la main sur votre catalogue" },
];

export function SellerAuthLayout({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "register" | "login";
}) {
  const isRegister = variant === "register";

  return (
    <main className="seller-auth-page">
      <div className="seller-auth-shell">
        <section className="seller-auth-aside">
          <div className="seller-auth-orbit seller-auth-orbit-one" aria-hidden="true" />
          <div className="seller-auth-orbit seller-auth-orbit-two" aria-hidden="true" />
          <header className="relative z-10 flex items-center justify-between gap-4">
            <Link href="/accueil" aria-label="Retour à l’accueil ORIVFIDE">
              <OrivfideLogo variant="light" />
            </Link>
            <Link className="seller-auth-home-link" href="/accueil">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Retour au site</span>
            </Link>
          </header>

          <div className="seller-auth-aside-copy">
            <p className="seller-auth-eyebrow">
              <span className="seller-auth-live-dot" />
              L’espace des vendeurs ORIVFIDE
            </p>
            <h2 className="seller-auth-aside-title">
              {isRegister ? (
                <>Votre commerce mérite <span>sa vitrine.</span></>
              ) : (
                <>Ravi de vous <span>revoir.</span></>
              )}
            </h2>
            <p className="seller-auth-aside-text">
              {isRegister
                ? "Préparez votre boutique et faites découvrir votre univers sur une marketplace pensée pour connecter le commerce."
                : "Retrouvez votre boutique, vos produits et votre espace vendeur en quelques instants."}
            </p>

            <div className="seller-auth-benefits">
              {highlights.map(({ icon: Icon, text }, index) => (
                <div className="seller-auth-benefit" key={text}>
                  <span className="seller-auth-benefit-icon">
                    <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
                  </span>
                  <span>{text}</span>
                  {index === 0 && <BadgeCheck className="ml-auto h-4 w-4 text-white/45" aria-hidden="true" />}
                </div>
              ))}
            </div>

            <div className="seller-auth-community">
              <span className="seller-auth-community-icon"><Users className="h-4 w-4" aria-hidden="true" /></span>
              <span>Une même plateforme, plusieurs univers de commerce.</span>
            </div>
          </div>

          <div className="seller-auth-art" aria-label="Aperçu des univers de produits">
            <div className="seller-auth-art-card seller-auth-art-main">
              <Image
                src="/markets/fashion-shopping.jpg"
                alt="Mode et habillement"
                fill
                priority
                sizes="(max-width: 1023px) 1px, 35vw"
                className="object-cover"
              />
              <span>Mode & style</span>
            </div>
            <div className="seller-auth-art-card seller-auth-art-top">
              <Image
                src="/markets/electronics-phone.jpg"
                alt="Produits électroniques"
                fill
                sizes="(max-width: 1023px) 1px, 18vw"
                className="object-cover"
              />
            </div>
            <div className="seller-auth-art-card seller-auth-art-bottom">
              <Image
                src="/markets/beauty-cosmetics.jpg"
                alt="Produits cosmétiques"
                fill
                sizes="(max-width: 1023px) 1px, 18vw"
                className="object-cover"
              />
            </div>
            <div className="seller-auth-art-stamp">
              <span>7</span>
              <small>univers<br />à explorer</small>
            </div>
          </div>

          <p className="seller-auth-aside-footer">ORIVFIDE · Le commerce, à votre façon</p>
        </section>

        <section className="seller-auth-content">
          <div className="seller-auth-form-wrap">
            {children}
            <p className="seller-auth-legal">
              En continuant, vous acceptez de fournir des informations exactes pour votre compte et votre boutique.
            </p>
          </div>
          <Link className="seller-auth-content-home" href="/accueil">
            Retour au site <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  );
}
