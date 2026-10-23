"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Heart,
  Menu,
  Package,
  ShoppingBag,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import { FavoritesLink } from "@/components/FavoritesLink";
import { OrivfideLogo } from "@/components/OrivfideLogo";

const sectionLinks = [
  { href: "#univers", label: "Nos univers", icon: Package },
  { href: "#boutiques", label: "Boutiques", icon: Store },
  { href: "#acteurs", label: "Pour chacun", icon: UsersRound },
  { href: "#vision", label: "Notre vision", icon: Compass },
];

export function MarketplaceNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="relative mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
      <Link href="/accueil" aria-label="ORIVFIDE — accueil" className="shrink-0">
        <OrivfideLogo priority />
      </Link>

      <nav aria-label="Navigation principale" className="hidden min-w-0 flex-1 items-center justify-center gap-5 xl:flex 2xl:gap-7">
        {sectionLinks.map((item) => (
          <a key={item.href} className="home-nav-link whitespace-nowrap" href={item.href}>
            {item.label}
          </a>
        ))}
        <Link className="home-nav-link whitespace-nowrap" href="/vendeur/inscription">
          Vendre sur ORIVFIDE
        </Link>
      </nav>

      <div className="hidden shrink-0 items-center gap-4 xl:flex">
        <Link className="home-nav-link inline-flex items-center gap-1.5 whitespace-nowrap" href="/panier">
          <ShoppingBag aria-hidden="true" size={17} />
          Mon panier
        </Link>
        <FavoritesLink className="home-nav-link inline-flex items-center gap-1.5 whitespace-nowrap" />
        <Link className="home-nav-cta whitespace-nowrap" href="#boutiques">
          Explorer les boutiques <ArrowUpRight aria-hidden="true" size={16} />
        </Link>
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 text-orivfide-red transition hover:border-orivfide-red hover:bg-[#fff7f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orivfide-red xl:hidden"
        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
        aria-controls="mobile-marketplace-menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen
          ? <X aria-hidden="true" size={21} />
          : <Menu aria-hidden="true" size={21} />}
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            aria-hidden="true"
            tabIndex={-1}
            className="home-mobile-nav-backdrop"
            onClick={closeMenu}
          />
          <nav
            id="mobile-marketplace-menu"
            aria-label="Menu principal"
            className="home-mobile-nav-panel"
          >
            <div className="home-mobile-nav-heading">
              <div>
                <p className="home-mobile-nav-eyebrow">ORIVFIDE · LE COMMERCE, À VOTRE FAÇON</p>
                <h2>Que souhaitez-vous découvrir ?</h2>
              </div>
              <span className="home-mobile-nav-mark" aria-hidden="true">
                <Store size={19} />
              </span>
            </div>

            <div className="home-mobile-nav-section">
              <p className="home-mobile-nav-section-label">Explorer</p>
              <div className="home-mobile-nav-links">
                {sectionLinks.map(({ href, label, icon: Icon }, index) => (
                  <a
                    key={href}
                    className="home-mobile-nav-link"
                    href={href}
                    onClick={closeMenu}
                  >
                    <span className="home-mobile-nav-link-icon">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <span className="home-mobile-nav-link-title">{label}</span>
                    <span className="home-mobile-nav-link-index">0{index + 1}</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="home-mobile-nav-shortcuts">
              <Link className="home-mobile-nav-shortcut" href="/panier" onClick={closeMenu}>
                <ShoppingBag aria-hidden="true" size={18} />
                <span>Mon panier</span>
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
              <Link className="home-mobile-nav-shortcut" href="/favoris" onClick={closeMenu}>
                <Heart aria-hidden="true" size={18} />
                <span>Mes favoris</span>
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            </div>

            <div className="home-mobile-nav-vendor">
              <div>
                <p>Vous êtes vendeur ?</p>
                <span>Retrouvez vos produits et votre stock.</span>
              </div>
              <Link href="/vendeur/dashboard" onClick={closeMenu}>
                Mon espace <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <Link className="home-mobile-nav-create-store" href="/vendeur/inscription" onClick={closeMenu}>
              Vous n’avez pas encore de boutique ? <span>Créer ma boutique</span>
            </Link>

            <Link className="home-mobile-nav-cta" href="#boutiques" onClick={closeMenu}>
              Explorer les boutiques <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <p className="home-mobile-nav-footer">Une ambition née au Cameroun, tournée vers tous.</p>
          </nav>
        </>
      )}
    </div>
  );
}
