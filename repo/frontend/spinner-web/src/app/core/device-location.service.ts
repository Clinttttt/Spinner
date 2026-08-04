import { Injectable } from '@angular/core';

export interface DeviceLocation {
  accuracyMeters: number | null;
  latitude: number;
  longitude: number;
}

export type GeolocationFailure =
  'unsupported' | 'insecureContext' | 'permissionDenied' | 'positionUnavailable' | 'timeout';

export class GeolocationUnavailableError extends Error {
  constructor(
    public readonly reason: GeolocationFailure,
    message: string,
    /** True when the only realistic fix is opening the page in a real browser. */
    public readonly suggestExternalBrowser = false,
  ) {
    super(message);
    this.name = 'GeolocationUnavailableError';
  }
}

/**
 * A coarse network fix normally lands in a couple of seconds.
 *
 * Kept short on purpose. In an in-app browser the success callback frequently
 * never fires at all, and the previous 8s + 20s pair meant the customer stared at
 * "Finding your location…" for nearly half a minute before being told it had
 * failed. Giving up quickly and offering a way out is more useful than waiting.
 */
const COARSE_TIMEOUT_MS = 6_000;
const PRECISE_TIMEOUT_MS = 12_000;

/**
 * How long to let the watch fallback run.
 *
 * Some Android WebViews never answer getCurrentPosition but do emit a position to
 * watchPosition, so it is worth one short attempt before declaring failure.
 */
const WATCH_TIMEOUT_MS = 6_000;

@Injectable({ providedIn: 'root' })
export class DeviceLocationService {
  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * True in the Facebook/Messenger/Instagram in-app browser.
   *
   * These WebViews only receive a position if the host app itself holds the OS
   * location permission, which a web page cannot request or even inspect. So this
   * is not a "maybe slow" case: it is frequently unobtainable, and the honest
   * response is to say so and offer the map instead.
   */
  get isInAppBrowser(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|GSA\//i.test(navigator.userAgent);
  }

  /** Secure-origin requirement. localhost counts as secure. */
  get isSecureContext(): boolean {
    if (typeof window === 'undefined') return false;
    return window.isSecureContext === true;
  }

  /**
   * Builds a link that opens the current page outside the in-app browser.
   *
   * Android WebViews honour an intent URL, which is the only reliable way to hand
   * the page to Chrome from inside Messenger. Elsewhere the plain URL is returned
   * so it can be copied.
   */
  externalBrowserLink(): { href: string; isIntent: boolean } {
    if (typeof window === 'undefined') return { href: '', isIntent: false };

    const url = window.location.href;
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (!isAndroid) return { href: url, isIntent: false };

    const withoutScheme = url.replace(/^https?:\/\//, '');
    return {
      href: `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`,
      isIntent: true,
    };
  }

  /**
   * Reads the device position, preferring speed over precision.
   *
   * Resolves with the first usable fix. `onRefined` is invoked later if a more
   * accurate reading arrives, so a pin can be upgraded in place without making the
   * customer wait for it.
   */
  async getCurrentPosition(
    onRefined?: (location: DeviceLocation) => void,
  ): Promise<DeviceLocation> {
    if (!this.isSupported) {
      throw new GeolocationUnavailableError(
        'unsupported',
        'This browser cannot share your location. Point out your pickup point on the map instead.',
      );
    }

    if (!this.isSecureContext) {
      throw new GeolocationUnavailableError(
        'insecureContext',
        'Location sharing needs a secure (https) connection. Point out your pickup point on the map instead.',
      );
    }

    // A denied permission never succeeds, so there is no point spending seconds
    // discovering that. Not every browser exposes this, hence the guard.
    if (await this.isPermissionDenied()) {
      throw this.deniedError();
    }

    const coarse = await this.read({
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: COARSE_TIMEOUT_MS,
    }).catch((error: GeolocationUnavailableError) => error);

    if (!(coarse instanceof GeolocationUnavailableError)) {
      if (onRefined) this.refineInBackground(coarse, onRefined);
      return coarse;
    }

    if (coarse.reason === 'permissionDenied') throw coarse;

    // One patient high-accuracy attempt.
    const precise = await this.read({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: PRECISE_TIMEOUT_MS,
    }).catch((error: GeolocationUnavailableError) => error);

    if (!(precise instanceof GeolocationUnavailableError)) return precise;
    if (precise.reason === 'permissionDenied') throw precise;

    // Last resort: some WebViews answer a watch but never a one-shot request.
    const watched = await this.watchOnce().catch((error: GeolocationUnavailableError) => error);

    if (!(watched instanceof GeolocationUnavailableError)) return watched;

    throw watched;
  }

  private refineInBackground(
    coarse: DeviceLocation,
    onRefined: (location: DeviceLocation) => void,
  ): void {
    // Best effort only. Failure is silent: the customer already has a pin.
    this.read({ enableHighAccuracy: true, maximumAge: 0, timeout: PRECISE_TIMEOUT_MS })
      .then((precise) => {
        const better =
          precise.accuracyMeters === null ||
          coarse.accuracyMeters === null ||
          precise.accuracyMeters < coarse.accuracyMeters;
        if (better) onRefined(precise);
      })
      .catch(() => undefined);
  }

  private async isPermissionDenied(): Promise<boolean> {
    try {
      if (typeof navigator === 'undefined' || !navigator.permissions?.query) return false;
      const status = await navigator.permissions.query({ name: 'geolocation' });
      return status.state === 'denied';
    } catch {
      // Unsupported or throws on this name. Fall through and just try.
      return false;
    }
  }

  private read(options: PositionOptions): Promise<DeviceLocation> {
    return new Promise<DeviceLocation>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(this.toLocation(position)),
        (error) => reject(this.describe(error)),
        options,
      );
    });
  }

  /** Resolves with the first position a watch reports, then stops watching. */
  private watchOnce(): Promise<DeviceLocation> {
    return new Promise<DeviceLocation>((resolve, reject) => {
      let watchId: number | null = null;
      let settled = false;

      const stop = () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      };

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        stop();
        reject(this.timeoutError());
      }, WATCH_TIMEOUT_MS);

      const finish = (outcome: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        stop();
        outcome();
      };

      try {
        watchId = navigator.geolocation.watchPosition(
          (position) => finish(() => resolve(this.toLocation(position))),
          (error) => finish(() => reject(this.describe(error))),
          { enableHighAccuracy: false, maximumAge: 120_000, timeout: WATCH_TIMEOUT_MS },
        );

        // A callback can fire before watchPosition returns, in which case stop()
        // above had no id to clear yet. Releasing it here prevents a watch that
        // runs for the life of the page.
        if (settled) stop();
      } catch {
        finish(() => reject(this.timeoutError()));
      }
    });
  }

  private toLocation(position: GeolocationPosition): DeviceLocation {
    return {
      accuracyMeters: Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : null,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  private deniedError(): GeolocationUnavailableError {
    return new GeolocationUnavailableError(
      'permissionDenied',
      this.isInAppBrowser
        ? 'This in-app browser will not share your location. Open the page in your browser, or point out your pickup point on the map.'
        : 'Location permission is blocked for this site. Allow it in your browser settings, or point out your pickup point on the map.',
      this.isInAppBrowser,
    );
  }

  private timeoutError(): GeolocationUnavailableError {
    return new GeolocationUnavailableError(
      'timeout',
      this.isInAppBrowser
        ? 'This in-app browser never returned your location. That usually means Messenger itself does not have location permission, which this page cannot change. Open the page in your browser, or point out your pickup point on the map.'
        : 'Finding your location took too long. Point out your pickup point on the map, or try again.',
      this.isInAppBrowser,
    );
  }

  private describe(error: GeolocationPositionError): GeolocationUnavailableError {
    if (error.code === error.PERMISSION_DENIED) return this.deniedError();

    if (error.code === error.POSITION_UNAVAILABLE) {
      return new GeolocationUnavailableError(
        'positionUnavailable',
        this.isInAppBrowser
          ? 'Your location could not be determined in this in-app browser. Open the page in your browser, or point out your pickup point on the map.'
          : 'Your location could not be determined. Point out your pickup point on the map instead.',
        this.isInAppBrowser,
      );
    }

    return this.timeoutError();
  }
}
