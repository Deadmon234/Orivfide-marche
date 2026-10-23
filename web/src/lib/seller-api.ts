import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const sellerTokenCookieName = "orivfide_seller_token";
export const customerTokenCookieName = "orivfide_customer_token";
const adminKeyCookieName = "orivfide_admin_key";

export type CustomerAccount = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
};

export type PublicProductVariant = {
  inventoryItemId: string;
  label: string;
  sku: string | null;
  available: boolean;
};

export type SellerAccount = {
  id: string;
  fullName: string;
  email: string;
  status: "pending_review" | "active" | "rejected";
  rejectionReason: string | null;
};

export type SellerStore = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  phone: string;
  isPublic: boolean;
};

export type SellerProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  available?: boolean;
  variants?: PublicProductVariant[];
  createdAt: string;
};

export type CustomerCartItem = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string | null;
  };
  variant: { label: string; sku: string | null };
  store: { id: string; name: string; slug: string };
  availableQuantity: number;
  lineTotal: string;
  canPurchase: boolean;
};

export type CustomerCart = {
  items: CustomerCartItem[];
  subtotal: string;
  currency: "XAF";
};

export type SellerInventoryItem = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productIsActive: boolean;
  variantLabel: string;
  sku: string | null;
  attributes: Record<string, string>;
  isDefault: boolean;
  variantIsActive: boolean;
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  stockStatus: "out_of_stock" | "low_stock" | "healthy";
  version: number;
  updatedAt: string;
};

export type SellerStockMovement = {
  id: string;
  type: string;
  quantityDelta: number;
  onHandBefore: number;
  onHandAfter: number;
  reason: string;
  createdAt: string;
};

export type SellerDashboard = {
  seller: SellerAccount;
  store: SellerStore;
  products: SellerProduct[];
};

export type PublicStore = {
  store: Omit<SellerStore, "phone">;
  products: SellerProduct[];
};

export type PublicStoreListing = {
  store: PublicStore["store"];
  products: SellerProduct[];
};

export type AdminSeller = {
  id: string;
  fullName: string;
  email: string;
  status: "pending_review" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  store: {
    id: string;
    name: string;
    slug: string;
    category: string;
    phone: string;
  };
};

export type AdminOverview = {
  pendingSellers: number;
  activeSellers: number;
  rejectedSellers: number;
  publicStores: number;
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
};

export type AdminProduct = SellerProduct & {
  store: { name: string; slug: string };
  seller: { name: string; email: string };
};

export type AdminStore = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  phone: string;
  isPublic: boolean;
  createdAt: string;
  seller: {
    name: string;
    email: string;
    status: "pending_review" | "active" | "rejected";
  };
  productCount: number;
};

type ApiErrorBody = { error?: string; message?: string };

export class SellerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SellerApiError";
  }
}

function backendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:4000";
  throw new Error("BACKEND_API_URL must be configured for the seller workspace.");
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SellerApiError("Le service vendeur a renvoyé une réponse illisible.", 502);
  }
  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new SellerApiError(
      errorBody.message ?? errorBody.error ?? "Le service vendeur n’a pas pu traiter la demande.",
      response.status,
    );
  }
  return body as T;
}

export async function sellerApi<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = (await cookies()).get(sellerTokenCookieName)?.value;
    if (!token) redirect("/vendeur/connexion");
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Seller API request failed", error);
    throw new SellerApiError("Le service vendeur est momentanément indisponible.", 503);
  }

  if (authenticated && response.status === 401) {
    redirect("/vendeur/connexion");
  }

  return parseResponse<T>(response);
}

export async function customerApi<T>(
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const token = (await cookies()).get(customerTokenCookieName)?.value;
    if (!token) throw new SellerApiError("Connectez-vous pour accéder à votre panier.", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Customer API request failed", error);
    throw new SellerApiError("Le service client est momentanément indisponible.", 503);
  }
  return parseResponse<T>(response);
}

export async function publicSellerApi<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, { cache: "no-store" });
  } catch (error) {
    console.error("Public seller API request failed", error);
    throw new SellerApiError("La boutique est momentanément indisponible.", 503);
  }
  return parseResponse<T>(response);
}

async function fetchProductImage(path: string, token?: string): Promise<Response> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    return await fetch(`${backendBaseUrl()}${path}`, {
      headers,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Product image request failed", error);
    return Response.json(
      { error: "The product image service is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function productImageResponse(id: string): Promise<Response> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return Response.json({ error: "Invalid product identifier." }, { status: 400 });
  }
  const token = (await cookies()).get(sellerTokenCookieName)?.value;
  if (token) {
    const sellerResponse = await fetchProductImage(
      `/api/seller/products/${id}/image`,
      token,
    );
    if (sellerResponse.status !== 401 && sellerResponse.status !== 404) {
      return sellerResponse;
    }
  }
  return fetchProductImage(`/api/public/products/${id}/image`);
}

export async function requestAdmin<T>(path: string, key: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("x-admin-key", key);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${backendBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Admin API request failed", error);
    throw new SellerApiError("Le service administrateur est momentanément indisponible.", 503);
  }
  return parseResponse<T>(response);
}

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = (await cookies()).get(adminKeyCookieName)?.value;
  if (!key) redirect("/admin/connexion");
  try {
    return await requestAdmin<T>(path, key, init);
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      await clearAdminKey();
      redirect("/admin/connexion");
    }
    throw error;
  }
}

export async function setSellerToken(token: string) {
  (await cookies()).set(sellerTokenCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setCustomerToken(token: string) {
  (await cookies()).set(customerTokenCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCustomerToken() {
  (await cookies()).delete(customerTokenCookieName);
}

export async function clearSellerToken() {
  (await cookies()).delete(sellerTokenCookieName);
}

export async function setAdminKey(key: string) {
  (await cookies()).set(adminKeyCookieName, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminKey() {
  (await cookies()).set(adminKeyCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: 0,
  });
}

export async function getSellerDashboard() {
  return sellerApi<SellerDashboard>("/api/seller/dashboard");
}

export async function getCustomerProfile() {
  return customerApi<{ customer: CustomerAccount }>("/api/customer/me");
}

export async function getCustomerCart() {
  return customerApi<CustomerCart>("/api/customer/cart");
}

export async function getSellerInventory() {
  return sellerApi<{ inventory: SellerInventoryItem[]; nextCursor: string | null }>(
    "/api/seller/inventory",
  );
}

export async function getAdminSellers() {
  return adminApi<{ sellers: AdminSeller[] }>("/api/admin/sellers");
}

export async function getAdminOverview() {
  return adminApi<{ overview: AdminOverview }>("/api/admin/overview");
}

export async function getAdminProducts(limit = 50) {
  return adminApi<{ products: AdminProduct[] }>(`/api/admin/products?limit=${limit}`);
}

export async function getAdminStores(limit = 50) {
  return adminApi<{ stores: AdminStore[] }>(`/api/admin/stores?limit=${limit}`);
}

export async function getPublicStores() {
  return publicSellerApi<{ stores: PublicStoreListing[] }>("/api/public/stores");
}
