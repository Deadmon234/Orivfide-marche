import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ORIVFIDE — Boutiques et produits",
  description:
    "Découvrez les boutiques approuvées et leurs produits sur ORIVFIDE. Enregistrez vos produits préférés et retrouvez-les à tout moment.",
  icons: {
    icon: "/orivfide-logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable} scroll-smooth`}>
      <body className="min-h-screen antialiased">
        <FavoritesProvider>{children}</FavoritesProvider>
      </body>
    </html>
  );
}
