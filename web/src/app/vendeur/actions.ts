"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearSellerToken,
  SellerApiError,
  sellerApi,
  setSellerToken,
  type SellerAccount,
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

  redirect("/vendeur/contrat");
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
    if (result.seller.status === "contract_pending") destination = "/vendeur/contrat";
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

export async function acknowledgeDraftContract(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const accepted = formData.get("acknowledge") === "on";
  const signerName = readText(formData, "signerName");
  if (!accepted || signerName.length < 2) {
    return formError("Confirmez la lecture du brouillon et saisissez votre nom complet.");
  }

  try {
    await sellerApi("/api/seller/contract-acknowledgement", {
      method: "POST",
      body: JSON.stringify({ signerName, acknowledge: true }),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Draft contract acknowledgement request failed", error);
    return formError("La confirmation n’a pas pu être enregistrée. Réessayez.");
  }

  redirect("/vendeur/dashboard");
}

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000),
  price: z.number().int().positive().max(2_000_000_000),
  imageUrl: z.union([
    z.literal(""),
    z.string().url().max(2048).refine((value) => value.startsWith("https://")),
  ]),
});

export async function addSellerProduct(
  _previousState: SellerFormState,
  formData: FormData,
): Promise<SellerFormState> {
  const parsed = productSchema.safeParse({
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    price: Number(readText(formData, "price")),
    imageUrl: readText(formData, "imageUrl"),
  });

  if (!parsed.success) {
    return formError("Vérifiez le nom, le prix en FCFA et l’adresse HTTPS de la photo.");
  }

  try {
    await sellerApi("/api/seller/products", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Seller product creation request failed", error);
    return formError("Le produit n’a pas pu être ajouté. Réessayez.");
  }

  redirect("/vendeur/dashboard?produit=ajoute");
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
  redirect("/vendeur/dashboard");
}
