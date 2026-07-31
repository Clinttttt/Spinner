import { Injectable } from '@angular/core';

export interface DeviceLocation {
  accuracyMeters: number | null;
  latitude: number;
  longitude: number;
}

export class GeolocationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeolocationUnavailableError';
  }
}

const REQUEST_TIMEOUT_MS = 12_000;

@Injectable({ providedIn: 'root' })
export class DeviceLocationService {
  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Reads the device's current position.
   *
   * Browsers only expose geolocation on secure origins, and the customer can
   * always decline, so every failure is translated into a message the customer
   * can act on instead of a raw positioning error code.
   */
  getCurrentPosition(): Promise<DeviceLocation> {
    if (!this.isSupported) {
      return Promise.reject(
        new GeolocationUnavailableError(
          'This browser cannot share your location. Type your address instead.',
        ),
      );
    }

    return new Promise<DeviceLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            accuracyMeters: Number.isFinite(position.coords.accuracy)
              ? Math.round(position.coords.accuracy)
              : null,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        (error) => reject(new GeolocationUnavailableError(describe(error))),
        {
          enableHighAccuracy: true,
          maximumAge: 30_000,
          timeout: REQUEST_TIMEOUT_MS,
        },
      );
    });
  }
}

function describe(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission was blocked. Allow location for this site, or type your address instead.';
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Your location could not be determined right now. Try again outdoors, or type your address instead.';
  }

  if (error.code === error.TIMEOUT) {
    return 'Finding your location took too long. Try again, or type your address instead.';
  }

  return 'Your location could not be captured. Type your address instead.';
}
