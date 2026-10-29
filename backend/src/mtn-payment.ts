import { config } from "./config.js";
import { HttpError } from "./errors.js";

export function mtnPaymentConfigured(): boolean {
  return Boolean(config.MTN_MOMO_SUBSCRIPTION_KEY && config.MTN_MOMO_API_USER_ID && config.MTN_MOMO_API_SECRET);
}

async function mtnToken(): Promise<string> {
  if (!mtnPaymentConfigured()) throw new HttpError(503, "Le paiement MTN Mobile Money sandbox n’est pas configuré.");
  const credentials = Buffer.from(`${config.MTN_MOMO_API_USER_ID}:${config.MTN_MOMO_API_SECRET}`).toString("base64");
  const response = await fetch(`${config.MTN_MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": config.MTN_MOMO_SUBSCRIPTION_KEY!,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new HttpError(502, "Le fournisseur MTN Mobile Money est temporairement indisponible.");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new HttpError(502, "Le fournisseur MTN Mobile Money n’a pas fourni un jeton valide.");
  return body.access_token;
}

export async function requestMtnPayment(input: {
  referenceId: string;
  amountXaf: number;
  payerPhone: string;
  externalId: string;
  payerMessage: string;
}): Promise<void> {
  const token = await mtnToken();
  const response = await fetch(`${config.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": input.referenceId,
      "X-Target-Environment": config.MTN_MOMO_TARGET_ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": config.MTN_MOMO_SUBSCRIPTION_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: config.MTN_MOMO_TARGET_ENVIRONMENT === "sandbox" ? "1" : input.amountXaf.toString(),
      currency: config.MTN_MOMO_TARGET_ENVIRONMENT === "sandbox" ? "EUR" : "XAF",
      externalId: input.externalId,
      payer: { partyIdType: "MSISDN", partyId: input.payerPhone },
      payerMessage: input.payerMessage.slice(0, 160),
      payeeNote: "Paiement ORIVFIDE",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok && response.status !== 202) {
    throw new HttpError(502, "La demande de paiement MTN Mobile Money n’a pas pu être créée.");
  }
}

export async function getMtnPaymentStatus(referenceId: string): Promise<"pending" | "successful" | "failed" | "expired" | "cancelled"> {
  const token = await mtnToken();
  const response = await fetch(`${config.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": config.MTN_MOMO_TARGET_ENVIRONMENT,
      "Ocp-Apim-Subscription-Key": config.MTN_MOMO_SUBSCRIPTION_KEY!,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return "pending";
  if (!response.ok) throw new HttpError(502, "Le statut du paiement MTN Mobile Money est temporairement indisponible.");
  const body = await response.json() as { status?: string };
  const status = body.status?.toLowerCase();
  if (status === "successful") return "successful";
  if (status === "failed") return "failed";
  if (status === "expired") return "expired";
  if (status === "cancelled") return "cancelled";
  return "pending";
}
