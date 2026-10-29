"use server";

import { randomUUID } from "node:crypto";
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

const pendingCartItemSchema = z.object({
  inventoryItemId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
});

function readPendingCartItem(formData: FormData) {
  const inventoryItemId = readText(formData, "pendingInventoryItemId");
  const quantity = readText(formData, "pendingQuantity");
  if (!inventoryItemId && !quantity) return { valid: true as const, item: undefined };

  const parsed = pendingCartItemSchema.safeParse({ inventoryItemId, quantity });
  return parsed.success
    ? { valid: true as const, item: parsed.data }
    : { valid: false as const, item: undefined };
}

async function finishCustomerSignIn(
  pendingItem?: z.infer<typeof pendingCartItemSchema>,
): Promise<never> {
  if (!pendingItem) redirect("/panier");

  try {
    await customerApi("/api/customer/cart/items", {
      method: "POST",
      body: JSON.stringify(pendingItem),
    });
  } catch (error) {
    console.error("Adding pending customer cart item failed", error);
    redirect(`/panier?ajout=${error instanceof SellerApiError && [404, 409].includes(error.status) ? "indisponible" : "erreur"}`);
  }
  redirect("/panier?ajoute=oui");
}

export async function registerCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const pendingCartItem = readPendingCartItem(formData);
  if (!pendingCartItem.valid) return formError("Le produit à ajouter au panier n’est plus valide. Retournez à la boutique.");

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
    return formError("Vérifiez votre nom, votre adresse e-mail et votre mot de passe.");
  }

  try {
    const result = await customerApi<{ token: string }>(
      "/api/customer/auth/register",
      { method: "POST", body: JSON.stringify(parsed.data) },
      false,
    );
    await setCustomerToken(result.token);
  } catch (error) {
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Customer registration request failed", error);
    return formError("La création du compte n’a pas abouti. Réessayez plus tard.");
  }
  return finishCustomerSignIn(pendingCartItem.item);
}

export async function signInCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const pendingCartItem = readPendingCartItem(formData);
  if (!pendingCartItem.valid) return formError("Le produit à ajouter au panier n’est plus valide. Retournez à la boutique.");

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
  return finishCustomerSignIn(pendingCartItem.item);
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
      const searchParams = new URLSearchParams({
        retour: "panier",
        inventoryItemId: parsed.data.inventoryItemId,
        quantity: String(parsed.data.quantity),
      });
      redirect(`/client/connexion?${searchParams.toString()}`);
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

export async function confirmCustomerCheckout(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = z.object({
    payerPhone: z.string().trim().regex(/^237[0-9]{9}$/),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(32),
    addressLine1: z.string().trim().min(5).max(250),
    addressLine2: z.string().trim().max(250).optional().default(""),
    city: z.string().trim().min(2).max(120),
    region: z.string().trim().min(2).max(120),
  }).safeParse({
    payerPhone: readText(formData, "payerPhone"),
    fullName: readText(formData, "fullName"),
    phone: readText(formData, "phone"),
    addressLine1: readText(formData, "addressLine1"),
    addressLine2: readText(formData, "addressLine2"),
    city: readText(formData, "city"),
    region: readText(formData, "region"),
  });
  if (!parsed.success) return formError("Vérifiez l’adresse de livraison et le numéro MTN commençant par 237.");

  let confirmed: { order: { id: string; publicNumber: string } };
  try {
    confirmed = await customerApi<{ order: { id: string; publicNumber: string } }>(
      "/api/checkout/confirm",
      {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: randomUUID(),
          delivery: {
            fullName: parsed.data.fullName,
            phone: parsed.data.phone,
            addressLine1: parsed.data.addressLine1,
            addressLine2: parsed.data.addressLine2,
            city: parsed.data.city,
            region: parsed.data.region,
            country: "CM",
          },
        }),
      },
    );
    await customerApi<{ payment: { referenceId: string } }>(
      "/api/checkout/payment/mtn/initiate",
      {
        method: "POST",
        body: JSON.stringify({ orderId: confirmed.order.id, payerPhone: parsed.data.payerPhone, idempotencyKey: randomUUID() }),
      },
    );
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/client/connexion?retour=panier");
    if (error instanceof SellerApiError) return formError(error.message);
    console.error("Customer checkout and MTN initiation failed", error);
    return formError("Le paiement n’a pas pu être initié. Réessayez plus tard.");
  }
  redirect(`/commandes/${confirmed!.order.id}?paiement=attente`);
}

export async function checkCustomerMtnPayment(orderId: string) {
  try {
    const result = await customerApi<{ payment: { status: string } }>(
      `/api/checkout/payment/mtn/${encodeURIComponent(orderId)}/status`,
    );
    return result.payment.status;
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) redirect("/client/connexion?retour=panier");
    throw error;
  }
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
