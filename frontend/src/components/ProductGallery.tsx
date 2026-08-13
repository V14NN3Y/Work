"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { ProductImage } from "@/types";

interface ProductGalleryProps {
  images: ProductImage[];
  fallbackUrl: string | null;
  title: string;
}

export default function ProductGallery({ images, fallbackUrl, title }: ProductGalleryProps) {
  const slides = images.length > 0 ? images.map((i) => i.image_url) : fallbackUrl ? [fallbackUrl] : [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  if (slides.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground">
        Pas d&apos;image
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((src, idx) => (
            <div key={idx} className="relative aspect-square min-w-0 flex-[0_0_100%]">
              <Image src={src} alt={`${title} — image ${idx + 1}`} fill className="object-cover" priority={idx === 0} />
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {slides.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                idx === selectedIndex ? "border-primary" : "border-transparent"
              }`}
              aria-label={`Voir l'image ${idx + 1}`}
            >
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
