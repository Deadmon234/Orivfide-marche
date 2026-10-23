import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ArrowLeft, LockKeyhole, ShoppingBag } from "lucide-react";
import { clearCustomerCart, signOutCustomer } from "@/app/client/actions";
import { CartItemControls } from "./CartItemControls";
import { getCustomerCart, SellerApiError } from "@/lib/seller-api";

export const metadata = {
  title: "Mon panier | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function CustomerCartPage({
  searchParams,
}: {
  searchParams: Promise<{ ajoute?: string }>;
}) {
  await connection();
  let cart;
  try {
    cart = await getCustomerCart();
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/client/connexion?retour=panier");
    }
    if (error instanceof SellerApiError && error.status === 403) {
      redirect("/client/verifier-telephone?flow=account");
    }
    throw error;
  }
  const params = await searchParams;
  const storeSubtotals = new Map<string, { name: string; subtotal: bigint }>();
  for (const item of cart.items) {
    const current = storeSubtotals.get(item.store.id) ?? { name: item.store.name, subtotal: BigInt(0) };
    current.subtotal += BigInt(item.lineTotal);
    storeSubtotals.set(item.store.id, current);
  }

  return (
    <main className="min-h-screen bg-[#faf7f6] text-[#241518]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/accueil" className="inline-flex items-center gap-2 text-sm font-semibold text-orivfide-red">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Continuer mes achats
          </Link>
          <form action={signOutCustomer}>
            <button className="text-sm font-semibold text-orivfide-muted hover:text-orivfide-red">Se déconnecter</button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Espace client</p>
            <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mon panier</h1>
            <p className="mt-2 text-sm text-orivfide-muted">
              Les prix et disponibilités seront revérifiés avant toute commande.
            </p>
          </div>
          {cart.items.length > 0 && (
            <form action={clearCustomerCart}>
              <button className="text-sm font-semibold text-rose-800 hover:underline">Vider le panier</button>
            </form>
          )}
        </div>

        {params.ajoute === "oui" && (
          <p role="status" className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Le produit a été ajouté à votre panier.
          </p>
        )}

        {cart.items.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-black/5 bg-white px-5 py-14 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-orivfide-red" aria-hidden="true" />
            <h2 className="mt-4 font-serif text-xl font-bold">Votre panier est vide</h2>
            <p className="mt-2 text-sm text-orivfide-muted">Explorez les boutiques pour trouver un article.</p>
            <Link href="/accueil#boutiques" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-orivfide-red px-5 text-sm font-semibold text-white">
              Explorer les boutiques
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section aria-label="Articles du panier" className="space-y-4">
              {cart.items.map((item) => (
                <article key={item.id} className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
                  <div className="flex gap-4">
                    {item.product.imageUrl ? (
                      <Image
                        src={item.product.imageUrl}
                        alt=""
                        width={88}
                        height={88}
                        unoptimized
                        className="h-20 w-20 shrink-0 rounded-xl bg-zinc-100 object-cover sm:h-22 sm:w-22"
                      />
                    ) : (
                      <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#faf7f6] text-orivfide-red">
                        <ShoppingBag className="h-7 w-7" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/boutique/${item.store.slug}`} className="text-xs font-semibold text-orivfide-muted hover:text-orivfide-red">
                        {item.store.name}
                      </Link>
                      <h2 className="mt-1 font-semibold">{item.product.name}</h2>
                      <p className="mt-1 text-sm text-orivfide-muted">
                        {item.variant.label} · {new Intl.NumberFormat("fr-FR").format(item.product.price)} FCFA / unité
                      </p>
                      <p className="mt-2 font-semibold text-orivfide-red">
                        {new Intl.NumberFormat("fr-FR").format(BigInt(item.lineTotal))} FCFA
                      </p>
                    </div>
                  </div>
                  {!item.canPurchase && (
                    <p role="status" className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      {item.availableQuantity === 0
                        ? "Cet article est actuellement indisponible."
                        : `Quantité disponible actuellement : ${item.availableQuantity}.`}
                    </p>
                  )}
                  <CartItemControls itemId={item.id} quantity={item.quantity} />
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
              <h2 className="font-serif text-xl font-bold">Récapitulatif estimatif</h2>
              <dl className="mt-5 space-y-3">
                {[...storeSubtotals.entries()].map(([storeId, store]) => (
                  <div key={storeId} className="flex justify-between gap-3 text-sm">
                    <dt className="text-orivfide-muted">{store.name}</dt>
                    <dd className="font-medium">{new Intl.NumberFormat("fr-FR").format(store.subtotal)} FCFA</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-black/5 pt-4 text-base font-bold">
                  <dt>Sous-total produits</dt>
                  <dd>{new Intl.NumberFormat("fr-FR").format(BigInt(cart.subtotal))} FCFA</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-5 text-orivfide-muted">
                Estimation hors livraison. Les frais et modalités seront affichés avant qu’une commande soit disponible.
              </p>
              <button disabled className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-zinc-200 px-5 text-sm font-semibold text-zinc-600">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Commande bientôt disponible
              </button>
              <p className="mt-3 text-center text-xs leading-5 text-orivfide-muted">
                Aucun paiement ni commande n’est effectué depuis cette page.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
