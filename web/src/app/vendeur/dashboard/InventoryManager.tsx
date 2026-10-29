"use client";

import { useState, useTransition, useActionState } from "react";
import {
  archiveSellerVariant,
  createSellerVariant,
  getSellerInventoryPage,
  getSellerStockMovements,
  updateSellerStock,
  updateSellerStockThreshold,
  type SellerFormState,
} from "@/app/vendeur/actions";
import type { SellerInventoryItem, SellerStockMovement } from "@/lib/seller-api";

type InventoryFormItem = SellerInventoryItem & {
  movementKey: string;
  thresholdKey: string;
};

const initialState: SellerFormState = { message: "", success: false };

function movementLabel(movement: SellerStockMovement) {
  if (movement.type === "initial") return "Stock initial";
  if (movement.type === "receipt") return "Réception";
  if (movement.type === "correction") return "Correction";
  return movement.type;
}

function StockItem({ item }: { item: InventoryFormItem }) {
  const [movementState, movementAction, movementPending] = useActionState(updateSellerStock, initialState);
  const [thresholdState, thresholdAction, thresholdPending] = useActionState(updateSellerStockThreshold, initialState);
  const [variantState, variantAction, variantPending] = useActionState(createSellerVariant, initialState);
  const [archiveState, archiveAction, archivePending] = useActionState(archiveSellerVariant, initialState);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SellerStockMovement[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyPending, startHistoryTransition] = useTransition();

  function loadHistory(cursor?: string) {
    startHistoryTransition(async () => {
      const result = await getSellerStockMovements(item.id, cursor);
      setHistoryError(result.error ?? "");
      setHistory((current) => cursor ? [...current, ...result.movements] : result.movements);
      setHistoryCursor(result.nextCursor);
    });
  }

  return (
    <article className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.productName}</p>
          <p className="mt-1 text-sm text-orivfide-muted">
            {item.variantLabel}{item.isDefault ? " · variante principale" : ""}
            {item.sku ? ` · SKU ${item.sku}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
          item.stockStatus === "out_of_stock"
            ? "bg-rose-50 text-rose-800"
            : item.stockStatus === "low_stock"
              ? "bg-amber-50 text-amber-900"
              : "bg-emerald-50 text-emerald-800"
        }`}>
          {item.stockStatus === "out_of_stock"
            ? "Épuisé"
            : item.stockStatus === "low_stock"
              ? "Stock faible"
              : "Disponible"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["En stock", item.onHand],
          ["Réservé", item.reserved],
          ["Disponible", item.available],
          ["Seuil d’alerte", item.lowStockThreshold],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-[#faf7f6] p-3">
            <dt className="text-xs text-orivfide-muted">{label}</dt>
            <dd className="mt-1 text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <form action={movementAction} className="grid gap-3 rounded-xl border border-black/5 p-3 sm:grid-cols-2 sm:p-4">
          <input type="hidden" name="inventoryItemId" value={item.id} />
          <input type="hidden" name="idempotencyKey" value={item.movementKey} />
          <h3 className="font-semibold sm:col-span-2">Ajuster le stock</h3>
          <label className="seller-field">
            Variation (+ réception, − retrait)
            <input name="quantityDelta" type="number" min="-1000000" max="1000000" step="1" required />
          </label>
          <label className="seller-field">
            Motif
            <input name="reason" minLength={3} maxLength={500} required placeholder="Réception fournisseur" />
          </label>
          {movementState.message && (
            <p role="alert" className="text-sm text-rose-800 sm:col-span-2">{movementState.message}</p>
          )}
          <button disabled={movementPending} className="min-h-11 w-full rounded-full bg-orivfide-red px-4 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:w-auto sm:justify-self-start">
            {movementPending ? "Enregistrement…" : "Enregistrer le mouvement"}
          </button>
        </form>

        <form action={thresholdAction} className="grid gap-3 rounded-xl border border-black/5 p-3 sm:grid-cols-2 sm:p-4">
          <input type="hidden" name="inventoryItemId" value={item.id} />
          <input type="hidden" name="idempotencyKey" value={item.thresholdKey} />
          <h3 className="font-semibold sm:col-span-2">Seuil d’alerte</h3>
          <label className="seller-field">
            Quantité minimum
            <input name="lowStockThreshold" type="number" min="0" max="1000000" step="1" required defaultValue={item.lowStockThreshold} />
          </label>
          <label className="seller-field">
            Motif
            <input name="reason" minLength={3} maxLength={500} required placeholder="Seuil de réapprovisionnement" />
          </label>
          {thresholdState.message && (
            <p role="alert" className="text-sm text-rose-800 sm:col-span-2">{thresholdState.message}</p>
          )}
          <button disabled={thresholdPending} className="min-h-11 w-full rounded-full border border-black/10 px-4 text-sm font-semibold disabled:opacity-60 sm:col-span-2 sm:w-auto sm:justify-self-start">
            {thresholdPending ? "Enregistrement…" : "Enregistrer le seuil"}
          </button>
        </form>
      </div>

      {item.isDefault && (
        <form action={variantAction} className="mt-5 grid gap-3 rounded-xl bg-[#faf7f6] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="productId" value={item.productId} />
          <label className="seller-field">
            Ajouter une variante
            <input name="label" required minLength={1} maxLength={120} placeholder="Ex. Rouge / M" />
          </label>
          <label className="seller-field">
            SKU (facultatif)
            <input name="sku" maxLength={80} />
          </label>
          <button disabled={variantPending} className="min-h-11 w-full rounded-full border border-black/10 px-4 text-sm font-semibold disabled:opacity-60 sm:w-auto">
            {variantPending ? "Ajout…" : "Ajouter"}
          </button>
          {variantState.message && (
            <p role="alert" className="text-sm text-rose-800 sm:col-span-3">{variantState.message}</p>
          )}
        </form>
      )}

      {!item.isDefault && item.variantIsActive && (
        <form action={archiveAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="variantId" value={item.variantId} />
          <button disabled={archivePending} className="min-h-11 w-full rounded-full border border-rose-200 px-4 text-sm font-semibold text-rose-800 disabled:opacity-60 sm:w-auto">
            {archivePending ? "Archivage…" : "Archiver cette variante"}
          </button>
          {archiveState.message && <p role="alert" className="text-sm text-rose-800">{archiveState.message}</p>}
        </form>
      )}

      <div className="mt-5 border-t border-black/5 pt-4">
        <button
          type="button"
          aria-expanded={showHistory}
          onClick={() => {
            const next = !showHistory;
            setShowHistory(next);
            if (next && history.length === 0) loadHistory();
          }}
          className="text-sm font-semibold text-orivfide-red"
        >
          {showHistory ? "Masquer l’historique" : "Consulter l’historique"}
        </button>
        {showHistory && (
          <div className="mt-3 space-y-3">
            {historyError && <p role="alert" className="text-sm text-rose-800">{historyError}</p>}
            {history.length === 0 && !historyPending && !historyError && (
              <p className="text-sm text-orivfide-muted">Aucun mouvement de stock.</p>
            )}
            <ul className="divide-y divide-black/5">
              {history.map((movement) => (
                <li key={movement.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-sm">
                  <span>
                    <strong>{movementLabel(movement)}</strong>
                    {" · "}
                    {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                    {" · "}
                    {movement.reason}
                  </span>
                  <time className="text-xs text-orivfide-muted" dateTime={movement.createdAt}>
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(movement.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
            {historyCursor && (
              <button
                type="button"
                disabled={historyPending}
                onClick={() => loadHistory(historyCursor)}
                className="text-sm font-semibold text-orivfide-red disabled:opacity-60"
              >
                {historyPending ? "Chargement…" : "Charger les mouvements suivants"}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function InventoryManager({
  inventory: initialInventory,
  nextCursor: initialCursor,
  idempotencyKeys,
}: {
  inventory: SellerInventoryItem[];
  nextCursor: string | null;
  idempotencyKeys: Record<string, { movementKey: string; thresholdKey: string }>;
}) {
  const [inventory, setInventory] = useState<InventoryFormItem[]>(initialInventory.map((item) => ({
    ...item,
    ...idempotencyKeys[item.id],
  })));
  const [cursor, setCursor] = useState(initialCursor);
  const [loadError, setLoadError] = useState("");
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await getSellerInventoryPage(cursor);
      setLoadError(result.error ?? "");
      if (result.error) return;
      const added = result.inventory.map((item) => ({
        ...item,
        movementKey: crypto.randomUUID(),
        thresholdKey: crypto.randomUUID(),
      }));
      setInventory((current) => [...current, ...added]);
      setCursor(result.nextCursor);
    });
  }

  const activeItems = inventory.filter((item) => item.variantIsActive && item.productIsActive);
  const availableCount = activeItems.filter((item) => item.available > 0).length;
  const warningCount = activeItems.filter((item) => item.stockStatus !== "healthy").length;

  return (
    <section id="stock" className="scroll-mt-24 space-y-4">
      <p className="text-sm text-orivfide-muted">
        {availableCount} variante(s) disponible(s) · {warningCount} en rupture ou sous le seuil d’alerte.
        Les produits existants démarrent à zéro : renseignez vos quantités réelles.
      </p>
      {inventory.length === 0 ? (
        <p className="rounded-2xl border border-black/5 bg-white px-5 py-10 text-center text-sm text-orivfide-muted">
          Ajoutez d’abord un produit pour gérer son stock.
        </p>
      ) : (
        <div className="space-y-4">
          {inventory.map((item) => <StockItem key={item.id} item={item} />)}
        </div>
      )}
      {loadError && <p role="alert" className="text-sm text-rose-800">{loadError}</p>}
      {cursor && (
        <button
          type="button"
          disabled={pending}
          onClick={loadMore}
          className="min-h-11 w-full rounded-full border border-black/10 px-5 text-sm font-semibold disabled:opacity-60 sm:w-fit"
        >
          {pending ? "Chargement…" : "Charger plus de variantes"}
        </button>
      )}
    </section>
  );
}
