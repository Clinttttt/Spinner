import { Injectable } from '@angular/core';

export interface DeviceLocation {
  accuracyMeters: number | null;
  latitude: number;
  longitude: number;
}

export type GeolocationFailure =
  | 'unsupported'
  | 'insecureContext'
  | 'permissionDenied'
  | 'positionUnavailable'
  | 'timeout';

export class GeolocationUnavailableError extends Error {
  constructor(
    public readonly reason: GeolocationFailure,
    message: string,
  ) {
    super(message);
    this.name = 'GeolocationUnavailableError';
  }
}

/**
 * A coarse network-based fix arrives in a couple of seconds; a GPS fix can take
 * far longer and frequently never arrives at all inside an in-app browser. The
 * coarse attempt runs first so the customer sees a pin quickly, then a GPS
 * attempt refines it in the background.
 */
const COARSE_TIMEOUT_MS = 8_000;
const PRECISE_TIMEOUT_MS = 20_000;

@Injectable({ providedIn: 'root' })
export class DeviceLocationService {
  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * True in the Facebook/Messenger/Instagram in-app browser, where geolocation
   * is often blocked or extremely slow regardless of device settings.
   */
  get isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter/i.test(navigator.userAgent);
  }

  /** Secure-origin requirement. localhost counts as secure. */
  get isSecureContext(): boolean {
    if (typeof window === 'undefined') return false;
    return window.isSecureContext === true;
  }

  /**
   * Reads the device position, preferring speed over precision.
   *
   * Resolves with the first usable fix. `onRefined` is invoked later if a more
   * accurate GPS reading arrives, so the caller can upgrade a pin in place
   * without making the customer wait for it.
   */
  async getCurrentPosition(
    onRefined?: (location: DeviceLocation) => void,
  ): Promise<DeviceLocation> {
    if (!this.isSupported) {
      throw new GeolocationUnavailableError(
        'unsupported',
        'This browser cannot share your location. Search for a nearby place or move the map pin instead.',
      );
    }

    if (!this.isSecureContext) {
      throw new GeolocationUnavailableError(
        'insecureContext',
        'Location sharing needs a secure (https) connection. Move the map pin to your pickup point instead.',
      );
    }

    const coarse = await this.read({
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: COARSE_TIMEOUT_MS,
    }).catch((error: GeolocationUnavailableError) => error);

    if (coarse instanceof GeolocationUnavailableError) {
      // A denied permission will not succeed on a second attempt.
      if (coarse.reason === 'permissionDenied') throw coarse;

      // No coarse fix: fall back to one patient high-accuracy attempt.
      return this.read({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: PRECISE_TIMEOUT_MS,
      });
    }

    if (onRefined) {
      // Best effort only. Failure here is silent: the customer already has a pin.
      this.read({
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: PRECISE_TIMEOUT_MS,
      })
        .then((precise) => {
          const better =
            precise.accuracyMeters === null ||
            coarse.accuracyMeters === null ||
            precise.accuracyMeters < coarse.accuracyMeters;
          if (better) onRefined(precise);
        })
        .catch(() => undefined);
    }

    return coarse;
  }

  private read(options: PositionOptions): Promise<DeviceLocation> {
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
        (error) => reject(this.describe(error)),
        options,
      );
    });
  }

  private describe(error: GeolocationPositionError): GeolocationUnavailableError {
    if (error.code === error.PERMISSION_DENIED) {
      return new GeolocationUnavailableError(
        'permissionDenied',
        this.isInAppBrowser
          ? 'This in-app browser blocked location access. Open the page in Chrome, or move the map pin to your pickup point.'
          : 'Location permission was blocked. Allow location for this site, or move the map pin to your pickup point.',
      );
    }

    if (error.code === error.POSITION_UNAVAILABLE) {
      return new GeolocationUnavailableError(
        'positionUnavailable',
        'Your location could not be determined. Move the map pin to your pickup point instead.',
      );
    }

    return new GeolocationUnavailableError(
      'timeout',
      this.isInAppBrowser
        ? 'Finding your location is taking too long in this in-app browser. Move the map pin to your pickup point, or open the page in Chrome.'
        : 'Finding your location took too long. Move the map pin to your pickup point, or try again.',
    );
  }
}
