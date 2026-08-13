"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";

interface GeolocationButtonProps {
  onCaptured: (latitude: number, longitude: number) => void;
}

export default function GeolocationButton({ onCaptured }: GeolocationButtonProps) {
  const { state, requestPosition } = useGeolocation();

  useEffect(() => {
    if (state.status === "success") {
      onCaptured(state.latitude, state.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={state.status === "success" ? "outline" : "default"}
        className="w-full"
        onClick={requestPosition}
        disabled={state.status === "requesting"}
      >
        {state.status === "requesting" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Localisation en cours…
          </>
        )}
        {state.status === "success" && (
          <>
            <MapPin className="h-4 w-4" />
            Position partagée — cliquer pour actualiser
          </>
        )}
        {(state.status === "idle" || state.status === "error") && (
          <>
            <MapPin className="h-4 w-4" />
            Partager ma position GPS
          </>
        )}
      </Button>
      {state.status === "success" && (
        <p className="flex items-center gap-1.5 text-sm text-primary">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Position enregistrée ({state.latitude.toFixed(5)}, {state.longitude.toFixed(5)})
        </p>
      )}
      {state.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p>{state.message}</p>
            <button type="button" className="mt-2 font-medium underline" onClick={requestPosition}>
              Réessayer
            </button>
          </div>
        </div>
      )}
      {state.status === "idle" && (
        <p className="text-sm text-muted-foreground">
          Requis pour finaliser la commande — nous en avons besoin pour organiser la livraison.
        </p>
      )}
    </div>
  );
}
