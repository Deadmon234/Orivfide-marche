"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adminApi,
  clearAdminKey,
  requestAdmin,
  SellerApiError,
  setAdminKey,
} from "@/lib/seller-api";

export type AdminFormState = { message: string };
const initialError = (message: string): AdminFormState => ({ message });

export async function signInAdmin(
  _previousState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const key = formData.get("adminKey");
  if (typeof key !== "string" || key.length < 32 || key.length > 256) {
    return initialError("Saisissez la clé administrateur configurée sur le backend.");
  }
  try {
    await requestAdmin("/api/admin/verify", key);
  } catch (error) {
    if (error instanceof SellerApiError && error.status === 401) {
      return initialError("La clé administrateur est incorrecte.");
    }
    if (error instanceof SellerApiError && error.status === 503) {
      return initialError("L’accès administrateur n’est pas configuré sur le backend.");
    }
    console.error("Administrator sign-in failed", error);
    return initialError("La connexion administrateur est momentanément impossible.");
  }
  await setAdminKey(key);
  redirect("/admin/vendeurs");
}

export async function signOutAdmin() {
  await clearAdminKey();
  redirect("/admin/connexion");
}

export async function approveSeller(formData: FormData) {
  const sellerId = z.string().uuid().parse(formData.get("sellerId"));
  await adminApi(`/api/admin/sellers/${sellerId}/approve`, { method: "POST" });
  revalidatePath("/admin/vendeurs");
}

export async function rejectSeller(formData: FormData) {
  const parsed = z.object({
    sellerId: z.string().uuid(),
    reason: z.string().trim().min(5).max(1000),
  }).parse({
    sellerId: formData.get("sellerId"),
    reason: formData.get("reason"),
  });
  await adminApi(`/api/admin/sellers/${parsed.sellerId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: parsed.reason }),
  });
  revalidatePath("/admin/vendeurs");
}
