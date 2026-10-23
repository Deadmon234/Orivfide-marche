import Image from "next/image";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getSellerDashboard } from "@/lib/seller-api";
import { toggleSellerProduct } from "@/app/vendeur/actions";
import { ProductEditor } from "../ProductEditor";
import { ProductForm } from "../ProductForm";
import { SellerShell } from "../SellerShell";

export const metadata = {
  title: "Mes produits | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string }>;
}) {
  await connection();
  const { seller, store, products } = await getSellerDashboard();
  if (seller.status !== "active") redirect("/vendeur/statut");
  const params = await searchParams;

  return (
    <SellerShell seller={seller} store={store} activePage="products">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Catalogue vendeur</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Mes produits</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">
          Ajoutez et modifiez vos fiches produit. Les produits actifs apparaissent dans votre vitrine publique.
        </p>
      </div>
      {params.produit === "ajoute" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Le produit a été ajouté à votre boutique.
        </p>
      )}
      {params.produit === "modifie" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Les informations du produit ont été mises à jour.
        </p>
      )}

      <ProductForm />

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 sm:px-6">
          <h2 className="font-semibold">Catalogue</h2>
          <span className="text-xs text-orivfide-muted">{products.length} produit(s)</span>
        </div>
        {products.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-orivfide-muted">
            Aucun produit pour le moment. Utilisez le formulaire ci-dessus pour commencer.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {products.map((product) => (
              <li key={product.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="h-16 w-16 rounded-xl bg-zinc-100 object-cover"
                  />
                ) : (
                  <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#faf7f6] text-orivfide-red">
                    <Package className="h-6 w-6" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{product.name}</p>
                  <p className="mt-1 text-sm text-orivfide-muted">
                    {new Intl.NumberFormat("fr-FR").format(product.price)} FCFA
                  </p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
                  {product.isActive ? "Actif · public" : "Masqué"}
                </span>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <ProductEditor product={product} />
                  <form action={toggleSellerProduct}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="isActive" value={product.isActive ? "false" : "true"} />
                    <button className="min-h-10 rounded-full border border-black/10 px-4 text-xs font-semibold transition hover:border-orivfide-red hover:text-orivfide-red">
                      {product.isActive ? "Masquer" : "Réactiver"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SellerShell>
  );
}
