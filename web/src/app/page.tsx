import {
  Coins,
  Gift,
  Globe,
  Megaphone,
  MapPin,
  Network,
  Package,
  Rocket,
  Search,
  Shield,
  Store,
  Smartphone,
  Truck,
  TrendingUp,
  Users,
} from "lucide-react";
import { OrivfideLogo } from "@/components/OrivfideLogo";
import { MarketProductCarousel } from "@/components/MarketProductCarousel";
import { PresentationShell } from "@/components/PresentationShell";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { SectionHeader } from "@/components/SectionHeader";
import { markets } from "@/data/markets";

const navLinks = [
  { href: "#vision", label: "Vision" },
  { href: "#concept", label: "Concept" },
  { href: "#marche", label: "Marché" },
  { href: "#offre", label: "Offre" },
  { href: "#resume", label: "Résumé" },
];

export default function Home() {
  return (
    <>
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-orivfide-red-dark/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 md:px-12">
          <OrivfideLogo variant="light" className="scale-90" />
          <nav className="hidden gap-6 text-sm font-medium text-white/90 md:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <a
            href="/accueil"
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-orivfide-red transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Commencer
          </a>
        </div>
      </header>

      {/* Slide 1 — Hero */}
      <section className="hero-section flex min-h-screen flex-col justify-center bg-orivfide-red-dark px-6 pb-16 pt-24 text-white md:px-12 lg:px-20">
        <div className="hero-content mx-auto w-full max-w-6xl">
          <p className="mb-10 text-xs font-medium uppercase tracking-[0.3em] text-white/80">
            ORIVFIDE — Le commerce, à votre façon
          </p>
          <OrivfideLogo
            variant="light"
            size="large"
            className="mb-8"
          />
          <p className="max-w-2xl text-lg italic leading-relaxed text-white/95 md:text-xl">
            La plateforme e-commerce qui connecte fournisseurs, revendeurs et acheteurs — partout
            au Cameroun, pour commencer.
          </p>
          <div className="mt-16 grid gap-10 sm:grid-cols-3">
            {[
              { value: "300", label: "boutiques visées au lancement" },
              { value: "1 000+", label: "utilisateurs visés au lancement" },
              { value: "7", label: "marchés (catégories) couverts" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-serif text-5xl font-bold md:text-6xl">{stat.value}</p>
                <p className="mt-2 max-w-[14rem] text-sm leading-snug text-white/85">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Slide 2 — Vision */}
      <PresentationShell id="vision" className="bg-white">
        <SectionHeader
          label="Vision"
          title="Devenir une référence du commerce en ligne"
          description="Notre ambition est de construire une plateforme de commerce en ligne de référence — d'abord à l'échelle nationale, puis à l'échelle internationale."
          icon={Rocket}
        />
        <div className="grid flex-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: MapPin,
              title: "Phase 1 — National",
              text: "S'implanter solidement au Cameroun : 300 boutiques et 1 000+ utilisateurs au lancement, sur 7 marchés.",
            },
            {
              icon: Network,
              title: "Phase 2 — Consolidation",
              text: "Densifier le réseau de fournisseurs et de revendeurs, fidéliser les acheteurs, prouver le modèle économique.",
            },
            {
              icon: Globe,
              title: "Phase 3 — International",
              text: "Étendre le modèle vers d'autres marchés de la sous-région, une fois le socle national solide.",
            },
          ].map((phase) => (
            <article
              key={phase.title}
              className="flex flex-col rounded-2xl bg-orivfide-card p-8"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orivfide-red text-white">
                <phase.icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <h3 className="font-serif text-xl font-bold">{phase.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-orivfide-muted">{phase.text}</p>
            </article>
          ))}
        </div>
      </PresentationShell>

      {/* Slide 3 — Concept */}
      <PresentationShell id="concept" className="bg-zinc-50">
        <SectionHeader
          label="Le concept"
          title="Une place de marché à trois faces"
          description="ORIVFIDE met en relation trois publics sur une même plateforme : les fournisseurs qui veulent vendre, les revendeurs qui veulent s'approvisionner, et les clients qui veulent acheter directement."
        />
        <div className="grid flex-1 gap-6 md:grid-cols-3">
          <article className="flex flex-col rounded-2xl bg-orivfide-card p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orivfide-red text-white">
              <Package className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-xl font-bold">Fournisseurs</h3>
            <p className="mt-3 text-sm leading-relaxed text-orivfide-muted">
              Déposent leurs produits sur la plateforme, gagnent en visibilité sans avoir à gérer
              leur propre site.
            </p>
          </article>
          <article className="flex flex-col rounded-2xl bg-orivfide-red p-8 text-white">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-white text-orivfide-red">
              <span className="font-serif text-xl font-bold">O</span>
            </div>
            <h3 className="font-serif text-xl font-bold">ORIVFIDE</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              La plateforme de mise en relation : catalogue, paiement, logistique via partenaire de
              livraison.
            </p>
          </article>
          <article className="flex flex-col rounded-2xl bg-orivfide-card p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-orivfide-red text-white">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-xl font-bold">Acheteurs / Revendeurs</h3>
            <p className="mt-3 text-sm leading-relaxed text-orivfide-muted">
              Clients particuliers et revendeurs professionnels achètent en un seul endroit, livrés
              partout au Cameroun.
            </p>
          </article>
        </div>
      </PresentationShell>

      {/* Slide 4 — Marché */}
      <PresentationShell id="marche" className="bg-white">
        <SectionHeader
          label="Le marché"
          title="Le e-commerce camerounais, en chiffres"
          icon={TrendingUp}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              value: "≈ 490 Md",
              label: "FCFA — taille du marché e-commerce camerounais en 2025",
            },
            { value: "+18 %", label: "croissance du CA des plateformes e-commerce en 2024" },
            {
              value: "12,6 M",
              label: "internautes au Cameroun fin 2025 (41,9 % de la population)",
            },
            {
              value: "12,5 M",
              label: "utilisateurs actifs de Mobile Money (43 % des adultes)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-orivfide-card px-6 py-8 text-center"
            >
              <p className="font-serif text-3xl font-bold text-orivfide-red md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-orivfide-muted">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
            Ce que ça signifie pour ORIVFIDE
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-foreground md:text-base">
            {[
              "Un marché encore jeune (41,9 % de pénétration internet) : la place est à prendre",
              "Le paiement Mobile Money est déjà largement adopté — moins de friction à l'achat",
              "Douala et Yaoundé concentrent 35 % des transactions Mobile Money : priorité logique",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rotate-45 bg-orivfide-red" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs italic text-orivfide-muted">
            Sources : Statista/Investir au Cameroun (2025-2026), DataReportal Digital 2026 Cameroon,
            Simiz Guide Paiement Mobile 2026.
          </p>
        </div>
      </PresentationShell>

      {/* Slide 5 — Timing */}
      <PresentationShell id="timing" className="bg-zinc-50">
        <SectionHeader
          label="Le bon moment"
          title="Pourquoi lancer ORIVFIDE maintenant"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Un cadre fiscal qui protège les acteurs locaux",
              text: "Depuis 2026, les plateformes étrangères sans implantation physique paient 3 % de taxe sur leur CA local. ORIVFIDE, acteur 100 % local, n'a pas cette barrière à l'entrée.",
            },
            {
              icon: Smartphone,
              title: "Le Mobile Money a déjà gagné la confiance",
              text: "43 % des adultes camerounais utilisent activement le Mobile Money (contre 27 % en 2020). Le paiement digital n'est plus un obstacle à l'achat en ligne.",
            },
            {
              icon: Network,
              title: "L'État valide le secteur",
              text: "Le lancement en 2026 de Bolamba (Campost, 2-3 Md FCFA investis) confirme que le e-commerce est vu comme un axe stratégique national.",
            },
          ].map((card) => (
            <article key={card.title} className="rounded-2xl bg-orivfide-card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-orivfide-red text-white">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold leading-snug">{card.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-orivfide-muted">{card.text}</p>
            </article>
          ))}
        </div>
      </PresentationShell>

      {/* Slide 6 — Concurrence tableau */}
      <PresentationShell id="concurrence" className="bg-white">
        <SectionHeader
          label="Analyse de la concurrence"
          title="Vue d'ensemble du marché camerounais"
        />
        <div className="overflow-x-auto rounded-2xl border border-black/5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-orivfide-card">
                <th className="p-4 font-medium text-orivfide-muted" />
                {["Glotelho", "Iziway", "Nevo Market", "ORIVFIDE"].map((name) => (
                  <th
                    key={name}
                    className={`p-4 font-serif font-bold text-white ${
                      name === "ORIVFIDE" ? "bg-orivfide-red" : "bg-[#300b10]"
                    }`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {[
                ["Modèle", "Catalogue propre", "Marketplace ouverte", "Marketplace mobile", "Marketplace + revendeurs"],
                ["Ancienneté", "Depuis 2017-19", "Depuis 2019", "Lancé 2025-26", "À lancer"],
                ["Catalogue", "≈ 16 000 produits", "Multi-catégories", "Multi-catégories", "7 marchés visés"],
                ["Paiement", "En ligne classique", "En ligne classique", "MoMo / OM / Wave", "MoMo / OM visé"],
                ["Présence physique", "Multi-villes (10 régions visées)", "Douala (Akwa)", "Digital uniquement", "Corners chez fournisseurs"],
                ["Cible B2B", "Non", "Non", "Non", "Oui — différenciant"],
              ].map(([row, ...cells]) => (
                <tr key={row}>
                  <td className="bg-zinc-100 p-4 font-medium text-orivfide-muted">{row}</td>
                  {cells.map((cell, i) => (
                    <td
                      key={`${row}-${i}`}
                      className={`p-4 ${
                        i === 3
                          ? "bg-rose-50 font-medium text-orivfide-red"
                          : "even:bg-orivfide-card"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PresentationShell>

      {/* Slide 7 — Forces concurrents */}
      <PresentationShell id="concurrents" className="bg-zinc-50">
        <SectionHeader label="Analyse de la concurrence" title="Forces et limites de chaque acteur" />
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              name: "Glotelho",
              subtitle: "Le leader installé",
              forces: ["Marque forte, ~20 ans d'expertise groupe", "Catalogue maîtrisé (qualité, SAV)", "Présence physique multi-villes"],
              limit: "Modèle fermé : pas de place pour des vendeurs tiers ni des revendeurs B2B",
            },
            {
              name: "Iziway",
              subtitle: "La marketplace généraliste",
              forces: ["Ouvert à tout vendeur (type Jumia)", "Catégories larges", "Ancrage Douala (Akwa)"],
              limit: "Volumes de trafic historiquement modestes face à Glotelho ; peu de différenciation visible",
            },
            {
              name: "Nevo Market",
              subtitle: "Le nouvel entrant mobile-first",
              forces: ["App mobile moderne, social commerce", "Mobile Money natif + suivi temps réel", "Vendeurs vérifiés, litiges sous 24h"],
              limit: "Très récent : peu d'échelle prouvée à ce jour, notoriété encore à construire",
            },
          ].map((c) => (
            <article key={c.name} className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5">
              <h3 className="font-serif text-xl font-bold">{c.name}</h3>
              <p className="text-sm text-orivfide-red">{c.subtitle}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-orivfide-muted">
                Forces
              </p>
              <ul className="mt-2 space-y-2 text-sm text-orivfide-muted">
                {c.forces.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-orivfide-red" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-black/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-orivfide-muted">
                  Limite clé
                </p>
                <p className="mt-3 text-sm italic leading-relaxed">{c.limit}</p>
              </div>
            </article>
          ))}
        </div>
      </PresentationShell>

      {/* Slide 8 — Positionnement */}
      <PresentationShell id="positionnement" className="bg-orivfide-red" dark>
        <SectionHeader
          label="Notre positionnement"
          title="Pourquoi ORIVFIDE peut se démarquer"
          icon={Megaphone}
          dark
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              title: "Le seul à viser aussi les revendeurs (B2B2C)",
              text: "Glotelho, Iziway et Nevo Market ciblent le client final. ORIVFIDE ouvre aussi l'accès aux revendeurs — un marché encore non adressé.",
            },
            {
              title: "Présence physique intelligente et peu coûteuse",
              text: "Des roll-up chez les fournisseurs partenaires plutôt que des boutiques physiques propres : visibilité terrain sans le coût d'un réseau d'agences.",
            },
            {
              title: "Une marque visible jusqu'à la livraison",
              text: "Aucun concurrent identifié ne co-brande ses livreurs. Le polo rouge et blanc ORIVFIDE sur chaque livraison est un espace publicitaire gratuit et récurrent.",
            },
            {
              title: "Un prix de livraison clair et prévisible",
              text: "1 000 à 1 500 FCFA inclus dans chaque commande : simplicité pour le client, contrairement aux frais parfois variables ailleurs.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl bg-[#3a1116] p-8 text-white"
            >
              <h3 className="font-serif text-lg font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{item.text}</p>
            </article>
          ))}
        </div>
      </PresentationShell>

      {/* Slide 9 — Offre */}
      <PresentationShell id="offre" className="bg-zinc-50">
        <SectionHeader
          label="L'offre"
          title="7 marchés, une seule plateforme"
          description="Parcourez les univers de produits proposés sur la plateforme."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {markets.map(({ label, icon: Icon, slides }) => (
            <div
              key={label}
              className="market-card rounded-2xl bg-orivfide-card p-4"
            >
              <div className="mb-4 flex items-center gap-3 px-1">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orivfide-red text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-lg font-bold">{label}</h3>
              </div>
              <MarketProductCarousel market={label} slides={slides} />
            </div>
          ))}
          <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orivfide-red/30 p-6 text-center">
            <span className="font-serif text-3xl font-bold text-orivfide-red">+</span>
            <span className="mt-2 font-serif text-lg font-bold text-orivfide-red">
              D&apos;autres marchés à venir
            </span>
            <p className="mt-2 text-sm leading-relaxed text-orivfide-muted">
              De nouvelles catégories pourront s&apos;ajouter selon les besoins des clients.
            </p>
          </div>
        </div>
        <p className="mt-5 text-center text-xs italic text-orivfide-muted">
          Visuels illustratifs : le catalogue évolue selon les produits proposés par les fournisseurs
          partenaires.
        </p>
      </PresentationShell>

      {/* Slide 10 — Logistique */}
      <PresentationShell id="logistique" className="bg-white">
        <SectionHeader
          label="Logistique"
          title="Un partenariat livraison, pas une flotte à gérer"
          description="ORIVFIDE ne construit pas sa propre flotte de livraison : nous nous appuyons sur un partenaire spécialisé, ce qui limite l'investissement initial et accélère la mise sur le marché."
          icon={Truck}
        />
        <ol className="space-y-4">
          {[
            "Le client commande sur ORIVFIDE et paie le produit + les frais de livraison (1 000 à 1 500 FCFA), inclus dans le prix affiché",
            "Le partenaire logistique récupère la commande chez le fournisseur",
            "Livraison chez le client, avec le livreur portant le polo co-brandé Orivfide × partenaire",
            "Le partenaire logistique perçoit les frais de livraison pour chaque commande exécutée",
          ].map((step, i) => (
            <li
              key={step}
              className="flex gap-4 rounded-2xl bg-orivfide-card p-6 text-sm leading-relaxed md:text-base"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orivfide-red font-serif text-lg font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-3 text-center text-xs font-semibold uppercase tracking-wider text-amber-700 sm:grid-cols-2">
          <p className="rounded-full border border-amber-500 bg-amber-50 px-4 py-3">
            Nom du partenaire logistique — à confirmer
          </p>
          <p className="rounded-full border border-amber-500 bg-amber-50 px-4 py-3">
            Zone de couverture initiale — à définir
          </p>
        </div>
      </PresentationShell>

      {/* Slide 11 — Potentiel */}
      <PresentationShell id="potentiel" className="bg-zinc-50">
        <SectionHeader
          label="Potentiel de vente"
          title="Ce que 300 boutiques et 1 000 utilisateurs peuvent générer"
          description="Estimation construite à partir de nos objectifs de lancement. Hypothèses de fréquence d'achat et de panier moyen à affiner avec vos premières données réelles."
          icon={Coins}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              tier: "Prudent",
              activity: "5 % d'acheteurs actifs/mois",
              freq: "1,5 commande/mois",
              basket: "15 000 FCFA",
              gmv: "≈ 1,1 M FCFA/mois",
              annual: "≈ 13,5 M FCFA/an",
            },
            {
              tier: "Réaliste",
              activity: "10 % d'acheteurs actifs/mois",
              freq: "2 commandes/mois",
              basket: "20 000 FCFA",
              gmv: "≈ 4,0 M FCFA/mois",
              annual: "≈ 48 M FCFA/an",
            },
            {
              tier: "Optimiste",
              activity: "20 % d'acheteurs actifs/mois",
              freq: "3 commandes/mois",
              basket: "25 000 FCFA",
              gmv: "≈ 15,0 M FCFA/mois",
              annual: "≈ 180 M FCFA/an",
            },
          ].map((s) => (
            <article
              key={s.tier}
              className={`rounded-2xl p-8 ${
                s.tier === "Réaliste"
                  ? "bg-orivfide-red text-white"
                  : "bg-orivfide-card"
              }`}
            >
              <h3
                className={`font-serif text-xl font-bold ${
                  s.tier === "Réaliste" ? "text-white" : "text-orivfide-red"
                }`}
              >
                {s.tier}
              </h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className={s.tier === "Réaliste" ? "text-white/70" : "text-orivfide-muted"}>
                    Taux d&apos;activité
                  </dt>
                  <dd>{s.activity}</dd>
                </div>
                <div>
                  <dt className={s.tier === "Réaliste" ? "text-white/70" : "text-orivfide-muted"}>
                    Fréquence
                  </dt>
                  <dd>{s.freq}</dd>
                </div>
                <div>
                  <dt className={s.tier === "Réaliste" ? "text-white/70" : "text-orivfide-muted"}>
                    Panier moyen
                  </dt>
                  <dd>{s.basket}</dd>
                </div>
              </dl>
              <p className="mt-6 border-t border-current/10 pt-4 font-serif text-2xl font-bold">
                {s.gmv}
              </p>
              <p className={s.tier === "Réaliste" ? "text-sm text-white/75" : "text-sm text-orivfide-muted"}>
                {s.annual}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-5 rounded-full border border-amber-500 bg-amber-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-amber-700">
          Modèle de monétisation (commission par vente, abonnement boutique...) à définir pour
          traduire ce GMV en revenu ORIVFIDE
        </p>
      </PresentationShell>

      {/* Slide 12 — Objectifs */}
      <PresentationShell id="objectifs" className="bg-white">
        <SectionHeader
          label="Objectifs commerciaux"
          title="300 boutiques, 1 000+ utilisateurs : comment y arriver"
        />
        <div className="grid gap-8 md:grid-cols-2">
          <article className="rounded-2xl bg-orivfide-card p-8">
            <h3 className="flex items-center gap-4 font-serif text-xl font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orivfide-red text-white">
                <Store className="h-5 w-5" />
              </span>
              300 boutiques partenaires
            </h3>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-orivfide-muted">
              <li>• Démarchage sectoriel : cibler d&apos;abord 2-3 marchés forts (mode, électronique)</li>
              <li>• Onboarding gratuit et rapide (création boutique en moins de 15 min)</li>
              <li>• Commission de lancement préférentielle pour les 100 premiers inscrits</li>
              <li>• Roll-up et supports visuels fournis gratuitement à l&apos;inscription</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-orivfide-card p-8">
            <h3 className="flex items-center gap-4 font-serif text-xl font-bold">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orivfide-red text-white">
                <Users className="h-5 w-5" />
              </span>
              1 000+ utilisateurs actifs
            </h3>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-orivfide-muted">
              <li>• Offre de bienvenue : livraison offerte sur la première commande</li>
              <li>• Programme de parrainage (client qui invite = réduction pour les deux)</li>
              <li>• Visibilité terrain via les roll-up chez les fournisseurs partenaires</li>
              <li>• Présence sociale forte dès le lancement</li>
            </ul>
          </article>
        </div>
      </PresentationShell>

      {/* Slide 13 — Marketing */}
      <PresentationShell id="marketing" className="bg-zinc-50">
        <SectionHeader
          label="Marketing & communication"
          title="Ce qui est prévu — et ce qu'on peut ajouter"
          icon={Megaphone}
        />
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
              Ce qui est déjà prévu
            </p>
            <ul className="mt-4 space-y-4">
              {[
                {
                  icon: Truck,
                  title: "Livreurs co-brandés",
                  text: "Polos rouge & blanc ORIVFIDE × partenaire logistique — visibilité mobile récurrente",
                },
                {
                  icon: MapPin,
                  title: "Roll-up chez les fournisseurs",
                  text: "Signalétique en boutique partenaire pour ancrer la marque sur le terrain",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 rounded-xl bg-white p-5 ring-1 ring-black/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orivfide-red text-white">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-serif font-bold">{item.title}</p>
                    <p className="mt-1 text-sm text-orivfide-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orivfide-red">
              Idées complémentaires à considérer
            </p>
            <ul className="mt-4 space-y-4">
              {[
                {
                  icon: Search,
                  title: "Référencement (SEO)",
                  text: "Glotelho capte ~22 000 recherches/mois : viser ce trafic organique dès le lancement",
                },
                {
                  icon: Gift,
                  title: "Parrainage & ventes flash",
                  text: "Mécaniques déjà éprouvées par Nevo Market — créent de la récurrence à faible coût",
                },
                {
                  icon: Smartphone,
                  title: "Social commerce",
                  text: "Stories/reels vendeurs pour humaniser les boutiques, comme le fait Nevo Market",
                },
                {
                  icon: Shield,
                  title: 'Badge "vendeur vérifié"',
                  text: "Renforce la confiance — argument central face aux craintes d'arnaque en ligne",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3 rounded-xl bg-white p-5 ring-1 ring-black/5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orivfide-red text-white">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-serif font-bold">{item.title}</p>
                    <p className="mt-1 text-sm text-orivfide-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PresentationShell>

      {/* Slide 14 — Stratégie */}
      <PresentationShell id="strategie" className="bg-white">
        <SectionHeader
          label="Stratégie commerciale"
          title="De l'idée aux 300 premières boutiques"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              phase: "Mois 1-2 — Amorçage",
              accent: "bg-orivfide-red",
              items: [
                "Recruter 50 boutiques pilotes sur 2 marchés forts",
                "Finaliser l'accord avec le partenaire logistique",
              ],
            },
            {
              phase: "Mois 3-4 — Accélération",
              accent: "bg-[#922b3d]",
              items: ["Ouvrir les 7 marchés", "Lancer le programme de parrainage utilisateurs"],
            },
            {
              phase: "Mois 5-6 — Consolidation",
              accent: "bg-[#300b10]",
              items: [
                "Atteindre 300 boutiques et 1 000+ utilisateurs",
                "Premier bilan de rentabilité par marché",
              ],
            },
          ].map((block) => (
            <article key={block.phase} className="rounded-2xl bg-orivfide-card p-6">
              <h3
                className={`rounded-lg px-4 py-3 text-center font-serif text-lg font-bold text-white ${block.accent}`}
              >
                {block.phase}
              </h3>
              <ul className="mt-5 space-y-5 text-sm text-foreground">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rotate-45 bg-orivfide-red" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </PresentationShell>

      {/* Slide 15 — Roadmap */}
      <PresentationShell id="roadmap" className="bg-zinc-50">
        <SectionHeader
          label="Feuille de route"
          title="Prochaines étapes concrètes"
          icon={MapPin}
        />
        <ol className="space-y-3">
          {[
            "Finaliser et signer l'accord avec le partenaire logistique (frais, zones, polos)",
            "Définir précisément le modèle de monétisation (commission, abonnement boutique, ou mix)",
            "Développer / finaliser la plateforme (site + paiement Mobile Money)",
            "Recruter les 50 premières boutiques pilotes sur 2 marchés",
            "Lancer la communication (roll-up, réseaux sociaux, parrainage)",
            "Ouvrir officiellement au public avec objectif 300 boutiques / 1 000 utilisateurs",
          ].map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-4 rounded-xl bg-white p-5 text-sm md:text-base"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orivfide-red font-serif text-lg font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </PresentationShell>

      {/* Slide 16 — Résumé */}
      <section
        id="resume"
        className="flex min-h-screen flex-col justify-center bg-orivfide-red-dark px-6 py-20 text-white md:px-12 lg:px-20"
      >
        <RevealOnScroll className="mx-auto w-full max-w-6xl">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-orivfide-red">
              <Rocket className="h-7 w-7" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
              En résumé
            </p>
          </div>
          <h2 className="mt-4 font-serif text-3xl font-bold md:text-4xl">
            ORIVFIDE : une place de marché pensée pour tous
          </h2>
          <ol className="mt-10 space-y-4 text-lg leading-relaxed md:text-xl">
            {[
              "Un marché camerounais du e-commerce en croissance (+18 %), encore ouvert",
              "Un positionnement unique : le seul acteur qui adresse aussi les revendeurs",
              "Une stratégie marketing terrain différenciante (livreurs et fournisseurs co-brandés)",
              "Des objectifs de lancement clairs : 300 boutiques, 1 000+ utilisateurs, 7 marchés",
            ].map((item, i) => (
              <li key={item} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-serif text-lg font-bold text-orivfide-red">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <blockquote className="mt-12 border-l-4 border-white/40 pl-6 font-serif text-2xl italic md:text-3xl">
            « ORIVFIDE — Le marché, en un seul endroit. »
          </blockquote>
          <div className="mt-16">
            <OrivfideLogo variant="light" />
          </div>
        </RevealOnScroll>
      </section>
    </>
  );
}
