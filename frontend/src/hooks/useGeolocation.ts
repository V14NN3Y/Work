"use client";

import { useCallback, useState } from "react";

export type GeolocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "success"; latitude: number; longitude: number }
  | { status: "error"; message: string };

function errorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Vous avez refusé le partage de position. Autorisez la géolocalisation dans les paramètres de votre navigateur pour continuer.";
    case error.POSITION_UNAVAILABLE:
      return "Impossible de déterminer votre position actuellement. Vérifiez votre connexion et réessayez.";
    case error.TIMEOUT:
      return "La demande de position a expiré. Réessayez.";
    default:
      return "Une erreur est survenue lors de la récupération de votre position.";
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle" });

  const requestPosition = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "La géolocalisation n'est pas supportée par ce navigateur." });
      return;
    }
    setState({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "success",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => setState({ status: "error", message: errorMessage(error) }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { state, requestPosition };
}
