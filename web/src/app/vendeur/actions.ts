"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearSellerToken,
  SellerApiError,
  sellerApi,
  setSellerToken,
  type SellerAccount,
  type SellerInventoryItem,
  type SellerStockMovement,
  type SellerStore,
} from "@/lib/seller-api";

export type SellerFormState = {
  message: string;
  success: boolean;
};

const formError = (message: string): SellerFormState => ({ message, success: false });

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const accountSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email().max(254),
  password: z.string().min(10).refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Le mot de passe doit contenir au maximum 72 octets.",
  ),
  storeName: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  phone: z.string().min(6).max(32),
});

type SellerAuthResponse = {
  token: string;
  seller: SellerAccount;
  store: SellerStore;
};

export async function registerSeller(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = accountSchema.safeParse({
    fullName: readText(formData, "fullName"),
    email: readText(formData, "email").toLowerCase(),
    password: formData.get("password"),
    storeName: readText(formData, "storeName"),
    category: readText(formData, "category"),
    phone: readText(formData, "phone"),
  });

  if (!parsed.success) {
    return formError("Vérifiez les champs et choisissez un mot de passe d’au moins 10 caractères.");
  }

  try {
    const result = await sellerApi<SellerAuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          ...parsed.data,
        }),
      },
      false,
    );
    await setSellerToken(result.token);
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller registration request failed", error);
    return formError("La création du compte n’a pas abouti. Réessayez plus tard.");
  }

  redirect("/vendeur/statut");
}

export async function signInSeller(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(72),
  }).safeParse({
    email: readText(formData, "email").toLowerCase(),
    password: formData.get("password"),
  });

  if (!parsed.success) return formError("Saisissez une adresse e-mail et un mot de passe valides.");

  let destination = "/vendeur/dashboard";
  try {
    const result = await sellerApi<SellerAuthResponse>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(parsed.data) },
      false,
    );
    await setSellerToken(result.token);
    if (result.seller.status !== "active") destination = "/vendeur/statut";
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller login request failed", error);
    return formError("La connexion n’a pas abouti. Réessayez plus tard.");
  }
  redirect(destination);
}

export async function signOutSeller() {
  await clearSellerToken();
  redirect("/vendeur/connexion");
}

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000),
  price: z.number().int().positive().max(2_000_000_000),
});

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  category: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32),
});

export async function addSellerProduct(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return formError("Choisissez une image pour le produit.");
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return formError("Choisissez une image JPEG, PNG ou WebP.");
  }
  if (image.size > 3 * 1024 * 1024) {
    return formError("L’image ne doit pas dépasser 3 Mo.");
  }

  const parsed = productSchema.safeParse({
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    price: Number(readText(formData, "price")),
  });

  if (!parsed.success) {
    return formError("Vérifiez le nom du produit, sa description et son prix en FCFA.");
  }

  try {
    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    await sellerApi("/api/seller/products", {
      method: "POST",
      body: JSON.stringify({
        ...parsed.data,
        imageBase64,
        imageMimeType: image.type,
      }),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller product creation request failed", error);
    return formError("Le produit n’a pas pu être ajouté. Réessayez.");
  }

  redirect("/vendeur/dashboard/produits?produit=ajoute");
}

export async function toggleSellerProduct(formData: FormData) {
  const productId = readText(formData, "productId");
  if (!z.string().uuid().safeParse(productId).success) {
    throw new Error("Invalid product identifier.");
  }
  const isActive = formData.get("isActive") === "true";
  await sellerApi(`/api/seller/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  redirect("/vendeur/dashboard/produits");
}

export async function updateSellerProduct(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const productId = readText(formData, "productId");
  if (!z.string().uuid().safeParse(productId).success) {
    return formError("Identifiant de produit invalide.");
  }
  const parsed = productSchema.safeParse({
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    price: Number(readText(formData, "price")),
  });
  if (!parsed.success) {
    return formError("Vérifiez le nom du produit, sa description et son prix en FCFA.");
  }

  const imageValue = formData.get("image");
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  if (image && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
    return formError("Choisissez une image JPEG, PNG ou WebP.");
  }
  if (image && image.size > 3 * 1024 * 1024) {
    return formError("L’image ne doit pas dépasser 3 Mo.");
  }

  try {
    const imageFields = image
      ? {
          imageBase64: Buffer.from(await image.arrayBuffer()).toString("base64"),
          imageMimeType: image.type,
        }
      : {};
    await sellerApi(`/api/seller/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ ...parsed.data, ...imageFields }),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller product update request failed", error);
    return formError("Le produit n’a pas pu être modifié. Réessayez.");
  }

  redirect("/vendeur/dashboard/produits?produit=modifie");
}

export async function updateSellerStore(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = storeSchema.safeParse({
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    category: readText(formData, "category"),
    phone: readText(formData, "phone"),
  });
  if (!parsed.success) {
    return formError("Vérifiez le nom, la catégorie, la description et le téléphone.");
  }

  try {
    await sellerApi("/api/seller/store", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller store update request failed", error);
    return formError("Les informations de la boutique n’ont pas pu être modifiées.");
  }

  redirect("/vendeur/dashboard/boutique?boutique=modifiee");
}

const inventoryItemIdSchema = z.string().uuid();

export async function updateSellerStock(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = z.object({
    inventoryItemId: inventoryItemIdSchema,
    quantityDelta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: z.string().uuid(),
  }).safeParse({
    inventoryItemId: readText(formData, "inventoryItemId"),
    quantityDelta: Number(readText(formData, "quantityDelta")),
    reason: readText(formData, "reason"),
    idempotencyKey: readText(formData, "idempotencyKey"),
  });
  if (!parsed.success) return formError("Saisissez une variation de stock non nulle et un motif d’au moins 3 caractères.");

  try {
    const { inventoryItemId, ...body } = parsed.data;
    await sellerApi(`/api/seller/inventory/${inventoryItemId}/movements`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller inventory movement request failed", error);
    return formError("Le stock n’a pas pu être modifié. Réessayez.");
  }
  redirect("/vendeur/dashboard/stock?stock=modifie");
}

export async function updateSellerStockThreshold(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = z.object({
    inventoryItemId: inventoryItemIdSchema,
    lowStockThreshold: z.number().int().min(0).max(1_000_000),
    reason: z.string().trim().min(3).max(500),
    idempotencyKey: z.string().uuid(),
  }).safeParse({
    inventoryItemId: readText(formData, "inventoryItemId"),
    lowStockThreshold: Number(readText(formData, "lowStockThreshold")),
    reason: readText(formData, "reason"),
    idempotencyKey: readText(formData, "idempotencyKey"),
  });
  if (!parsed.success) return formError("Saisissez un seuil valide et un motif d’au moins 3 caractères.");

  try {
    const { inventoryItemId, ...body } = parsed.data;
    await sellerApi(`/api/seller/inventory/${inventoryItemId}/threshold`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller inventory threshold request failed", error);
    return formError("Le seuil n’a pas pu être modifié. Réessayez.");
  }
  redirect("/vendeur/dashboard/stock?stock=modifie");
}

export async function createSellerVariant(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = z.object({
    productId: z.string().uuid(),
    label: z.string().trim().min(1).max(120),
    sku: z.string().trim().max(80),
  }).safeParse({
    productId: readText(formData, "productId"),
    label: readText(formData, "label"),
    sku: readText(formData, "sku"),
  });
  if (!parsed.success) return formError("Saisissez un nom de variante valide.");

  try {
    await sellerApi(`/api/seller/products/${parsed.data.productId}/variants`, {
      method: "POST",
      body: JSON.stringify({
        label: parsed.data.label,
        sku: parsed.data.sku || null,
        attributes: {},
      }),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller variant creation request failed", error);
    return formError("La variante n’a pas pu être ajoutée. Réessayez.");
  }
  redirect("/vendeur/dashboard/stock?stock=modifie");
}

export async function archiveSellerVariant(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const variantId = readText(formData, "variantId");
  if (!inventoryItemIdSchema.safeParse(variantId).success) {
    return formError("Identifiant de variante invalide.");
  }
  try {
    await sellerApi(`/api/seller/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller variant archive request failed", error);
    return formError("La variante n’a pas pu être archivée. Réessayez.");
  }
  redirect("/vendeur/dashboard/stock?stock=modifie");
}

export async function getSellerInventoryPage(
  cursor?: string,
): Promise<{ inventory: SellerInventoryItem[]; nextCursor: string | null; error: string | null }> {
  if (cursor && !z.string().uuid().safeParse(cursor).success) {
    return { inventory: [], nextCursor: null, error: "Curseur d’inventaire invalide." };
  }
  const query = new URLSearchParams({ limit: "50" });
  if (cursor) query.set("cursor", cursor);
  try {
    return {
      ...(await sellerApi<{ inventory: SellerInventoryItem[]; nextCursor: string | null }>(
        `/api/seller/inventory?${query.toString()}`,
      )),
      error: null,
    };
  } catch (error) {
    if (error instanceof SellerApiError) {
      return { inventory: [], nextCursor: null, error: error.message };
    }
    console.error("Seller inventory page request failed", error);
    return { inventory: [], nextCursor: null, error: "Le stock est momentanément indisponible." };
  }
}

export async function getSellerStockMovements(
  inventoryItemId: string,
  cursor?: string,
): Promise<{ movements: SellerStockMovement[]; nextCursor: string | null; error: string | null }> {
  if (!inventoryItemIdSchema.safeParse(inventoryItemId).success) {
    return { movements: [], nextCursor: null, error: "Identifiant d’inventaire invalide." };
  }
  if (cursor && cursor.length > 300) {
    return { movements: [], nextCursor: null, error: "Curseur d’historique invalide." };
  }
  const query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  try {
    const result = await sellerApi<{
      movements: SellerStockMovement[];
      nextCursor: string | null;
    }>(
      `/api/seller/inventory/${inventoryItemId}/movements?${query.toString()}`,
    );
    return { ...result, error: null };
  } catch (error) {
    if (error instanceof SellerApiError) {
      return { movements: [], nextCursor: null, error: error.message };
    }
    console.error("Seller stock history request failed", error);
    return { movements: [], nextCursor: null, error: "L’historique du stock est indisponible." };
  }
}
