import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ContractAcknowledgement } from "./ContractAcknowledgement";
import { getSellerDashboard } from "@/lib/seller-api";

export const metadata = {
  title: "Projet de contrat vendeur | ORIVFIDE",
  robots: { index: false, follow: false },
};
export const instant = false;

export default async function SellerContractPage() {
  await connection();
  const { seller, store } = await getSellerDashboard();
  if (seller.status !== "contract_pending") redirect("/vendeur/dashboard");

  return <ContractAcknowledgement sellerName={seller.fullName} storeName={store.name} />;
}
