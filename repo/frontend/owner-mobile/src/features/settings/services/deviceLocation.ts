import * as Location from "expo-location";

export interface CapturedLocation {
  accuracyMeters: number | null;
  latitude: number;
  longitude: number;
}

export class LocationPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocationPermissionError";
  }
}

/**
 * Reads the device position once, for capturing the shop's own coordinates.
 *
 * Kept separate from the pickup map so the owner app asks for location only when
 * the owner explicitly taps the button, never in the background.
 */
export async function captureCurrentLocation(): Promise<CapturedLocation> {
  const services = await Location.hasServicesEnabledAsync();
  if (!services) {
    throw new LocationPermissionError(
      "Location services are turned off on this device. Turn them on, or type the coordinates manually.",
    );
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new LocationPermissionError(
      permission.canAskAgain
        ? "Location permission is needed to capture the shop's coordinates."
        : "Location permission is blocked. Enable it for Spinner in Android settings, or type the coordinates manually.",
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    accuracyMeters: Number.isFinite(position.coords.accuracy)
      ? Math.round(position.coords.accuracy ?? 0)
      : null,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
