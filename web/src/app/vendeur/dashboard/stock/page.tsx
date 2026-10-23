import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSellerDashboard, getSellerInventory } from "@/lib/seller-api";
import { InventoryManager } from "../InventoryManager";
import { SellerShell } from "../SellerShell";

export const metadata = {
  title: "Gestion du stock | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ stock?: string }>;
}) {
  await connection();
  const [{ seller, store }, inventoryResult] = await Promise.all([
    getSellerDashboard(),
    getSellerInventory(),
  ]);
  if (seller.status !== "active") redirect("/vendeur/statut");
  const params = await searchParams;
  const idempotencyKeys = Object.fromEntries(inventoryResult.inventory.map((item) => [
    item.id,
    { movementKey: randomUUID(), thresholdKey: randomUUID() },
  ]));

  return (
    <SellerShell seller={seller} store={store} activePage="inventory">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orivfide-red">Gestion opérationnelle</p>
        <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Stock et variantes</h1>
        <p className="mt-2 text-sm leading-6 text-orivfide-muted">
          Consultez les quantités disponibles, enregistrez les mouvements et configurez vos seuils d’alerte.
        </p>
      </div>
      {params.stock === "modifie" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          La gestion du stock a été mise à jour.
        </p>
      )}
      <InventoryManager
        inventory={inventoryResult.inventory}
        nextCursor={inventoryResult.nextCursor}
        idempotencyKeys={idempotencyKeys}
      />
    </SellerShell>
  );
}
