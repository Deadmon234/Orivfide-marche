import Image from "next/image";

type MarketProductCarouselProps = {
  market: string;
  slides: { src: string; label: string }[];
};

export function MarketProductCarousel({ market, slides }: MarketProductCarouselProps) {
  return (
    <div className="market-carousel" role="group" aria-label={`Produits du marché ${market}`}>
      {slides.map((slide) => (
        <figure key={slide.src} className="market-slide">
          <Image
            src={slide.src}
            alt={slide.label}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
            className="object-cover"
          />
          <figcaption className="market-slide-caption">{slide.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}
