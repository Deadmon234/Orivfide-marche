"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearCustomerToken,
  customerApi,
  SellerApiError,
  setCustomerToken,
} from "@/lib/seller-api";

export type CustomerFormState = {
  message: string;
  success: boolean;
};

const formError = (message: string): CustomerFormState => ({ message, success: false });

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

const customerCredentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(10).refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Le mot de passe doit contenir au maximum 72 octets.",
  ),
});

export async function registerCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Le mot de passe doit contenir au maximum 72 octets.",
    ),
  }).safeParse({
    fullName: readText(formData, "fullName"),
    email: readText(formData, "email").toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return formError("Vérifiez vos informations et choisissez un mot de passe d’au moins 10 caractères.");
  }

  try {
    await customerApi(
      "/api/customer/auth/register",
      { method: "POST", body: JSON.stringify(parsed.data) },
      false,
    );
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Customer registration request failed", error);
    return formError("La création du compte n’a pas abouti. Réessayez plus tard.");
  }
  redirect("/client/connexion?inscription=ok");
}

export async function signInCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = customerCredentialsSchema.safeParse({
    email: readText(formData, "email").toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) return formError("Saisissez une adresse e-mail et un mot de passe valides.");

  try {
    const result = await customerApi<{ token: string }>(
      "/api/customer/auth/login",
      { method: "POST", body: JSON.stringify(parsed.data) },
      false,
    );
    await setCustomerToken(result.token);
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Customer login request failed", error);
    return formError("La connexion n’a pas abouti. Réessayez plus tard.");
  }
  redirect("/panier");
}

export async function signOutCustomer() {
  await clearCustomerToken();
  redirect("/client/connexion");
}

export async function addCustomerCartItem(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = z.object({
    inventoryItemId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(1_000_000),
  }).safeParse({
    inventoryItemId: readText(formData, "inventoryItemId"),
    quantity: readText(formData, "quantity") || "1",
  });
  if (!parsed.success) return formError("Choisissez une variante et une quantité valides.");

  try {
    await customerApi("/api/customer/cart/items", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/client/connexion?retour=panier");
    }
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Adding customer cart item failed", error);
    return formError("Le produit n’a pas pu être ajouté au panier. Réessayez.");
  }
  redirect("/panier?ajoute=oui");
}

export async function updateCustomerCartItem(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = z.object({
    itemId: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).max(1_000_000),
  }).safeParse({
    itemId: readText(formData, "itemId"),
    quantity: readText(formData, "quantity"),
  });
  if (!parsed.success) return formError("Saisissez une quantité valide.");

  try {
    await customerApi(`/api/customer/cart/items/${parsed.data.itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity: parsed.data.quantity }),
    });
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/client/connexion?retour=panier");
    }
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Updating customer cart item failed", error);
    return formError("La quantité n’a pas pu être mise à jour.");
  }
  redirect("/panier");
}

export async function removeCustomerCartItem(formData: FormData) {
  const itemId = readText(formData, "itemId");
  if (!z.string().uuid().safeParse(itemId).success) {
    throw new Error("Invalid cart item identifier.");
  }
  try {
    await customerApi(`/api/customer/cart/items/${itemId}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/client/connexion?retour=panier");
    }
    if (error instanceof SellerApiError) throw new Error(error.message);
    console.error("Removing customer cart item failed", error);
    throw new Error("Le produit n’a pas pu être retiré du panier.");
  }
  redirect("/panier");
}

export async function clearCustomerCart() {
  try {
    await customerApi("/api/customer/cart/items", { method: "DELETE" });
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      redirect("/client/connexion?retour=panier");
    }
    if (error instanceof SellerApiError) throw new Error(error.message);
    console.error("Clearing customer cart failed", error);
    throw new Error("Le panier n’a pas pu être vidé.");
  }
  redirect("/panier");
}
