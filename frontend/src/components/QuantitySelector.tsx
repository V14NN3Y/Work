"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuantitySelectorProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

export default function QuantitySelector({ value, max, onChange }: QuantitySelectorProps) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-lg border border-input">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Diminuer la quantité"
        className="rounded-none text-primary hover:text-primary"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="flex h-12 w-12 items-center justify-center font-medium">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Augmenter la quantité"
        className="rounded-none text-primary hover:text-primary"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
