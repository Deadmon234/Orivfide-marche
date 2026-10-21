import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const sellerTokenCookieName = "orivfide_seller_token";
const adminKeyCookieName = "orivfide_admin_key";

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

export async function getAdminSellers() {
  return adminApi<{ sellers: AdminSeller[] }>("/api/admin/sellers");
}
