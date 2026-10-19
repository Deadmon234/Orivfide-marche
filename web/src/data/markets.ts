import {
  BedDouble,
  BriefcaseBusiness,
  Footprints,
  Monitor,
  Refrigerator,
  Shirt,
  SprayCan,
} from "lucide-react";

export const markets = [
  {
    label: "Électronique",
    icon: Monitor,
    slides: [
      { src: "/markets/electronics-phone.jpg", label: "Téléphones" },
      { src: "/markets/electronics-laptop.jpg", label: "Ordinateurs portables" },
      { src: "/markets/electronics-headphones.jpg", label: "Audio et accessoires" },
    ],
  },
  {
    label: "Électroménager",
    icon: Refrigerator,
    slides: [
      { src: "/markets/appliances-fridge.jpg", label: "Réfrigérateurs" },
      { src: "/markets/appliances-microwave.jpg", label: "Fours micro-ondes" },
      { src: "/markets/appliances-blender.jpg", label: "Petits appareils de cuisine" },
    ],
  },
  {
    label: "Chaussures",
    icon: Footprints,
    slides: [
      { src: "/markets/shoes-sneakers.jpg", label: "Baskets" },
      { src: "/markets/shoes-heels.jpg", label: "Chaussures de ville" },
      { src: "/markets/shoes-sport.jpg", label: "Chaussures de sport" },
    ],
  },
  {
    label: "Mode",
    icon: Shirt,
    slides: [
      { src: "/markets/fashion-shopping.jpg", label: "Mode et habillement" },
      { src: "/markets/fashion-shirt.jpg", label: "Vêtements" },
      { src: "/markets/fashion-bag.jpg", label: "Sacs et accessoires" },
    ],
  },
  {
    label: "Linge",
    icon: BedDouble,
    slides: [
      { src: "/markets/home-linen-bedroom.jpg", label: "Linge de lit" },
      { src: "/markets/home-linen-towels.jpg", label: "Textiles et linge de maison" },
      { src: "/markets/home-linen-bed.jpg", label: "Décoration et textiles" },
    ],
  },
  {
    label: "Bureautique",
    icon: BriefcaseBusiness,
    slides: [
      { src: "/markets/office-desk.jpg", label: "Équipement de bureau" },
      { src: "/markets/office-writing.jpg", label: "Fournitures de bureau" },
      { src: "/markets/office-supplies.jpg", label: "Papeterie et fournitures" },
    ],
  },
  {
    label: "Cosmétique",
    icon: SprayCan,
    slides: [
      { src: "/markets/beauty-cosmetics.jpg", label: "Maquillage" },
      { src: "/markets/beauty-perfume.jpg", label: "Parfums" },
      { src: "/markets/beauty-skincare.jpg", label: "Soins de beauté" },
    ],
  },
];
