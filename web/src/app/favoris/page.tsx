import type { Metadata } from "next";
import { FavoritesPageContent } from "@/components/FavoritesPageContent";

export const metadata: Metadata = {
  title: "Mes favoris | ORIVFIDE",
  description: "Retrouvez les produits enregistrés dans vos favoris ORIVFIDE.",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesPageContent />;
}
