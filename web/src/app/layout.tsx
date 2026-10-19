import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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
  title: "ORIVFIDE — Le projet de marketplace",
  description:
    "Découvrez le projet ORIVFIDE, une marketplace imaginée pour réunir acheteurs, revendeurs et fournisseurs autour de sept univers de produits.",
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
