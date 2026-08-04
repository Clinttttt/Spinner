import { TestBed } from '@angular/core/testing';

import { DeviceLocationService, GeolocationUnavailableError } from './device-location.service';

const MESSENGER_UA =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/450.0]';

type PositionCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

function position(latitude: number, longitude: number, accuracy = 30): GeolocationPosition {
  return {
    coords: {
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude,
      longitude,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

function failure(code: number): GeolocationPositionError {
  return {
    code,
    message: '',
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
}

describe('DeviceLocationService', () => {
  let service: DeviceLocationService;
  let getCurrentPosition: ReturnType<typeof vi.fn>;
  let watchPosition: ReturnType<typeof vi.fn>;
  let clearWatch: ReturnType<typeof vi.fn>;

  function install(options: { userAgent?: string; permission?: PermissionState } = {}) {
    getCurrentPosition = vi.fn();
    watchPosition = vi.fn();
    clearWatch = vi.fn();

    vi.stubGlobal('navigator', {
      geolocation: { clearWatch, getCurrentPosition, watchPosition },
      permissions: options.permission
        ? { query: vi.fn().mockResolvedValue({ state: options.permission }) }
        : undefined,
      userAgent: options.userAgent ?? 'Mozilla/5.0 Chrome/120',
    });
    vi.stubGlobal('window', { isSecureContext: true, location: { href: 'https://spinner.test/' } });

    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceLocationService);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns the first coarse fix without waiting for precision', async () => {
    install();
    getCurrentPosition.mockImplementation((onSuccess: PositionCallback) =>
      onSuccess(position(9.2374, 125.9616, 40)),
    );

    const location = await service.getCurrentPosition();

    expect(location.latitude).toBe(9.2374);
    expect(location.accuracyMeters).toBe(40);
  });

  it('does not wait at all when permission is already denied', async () => {
    install({ permission: 'denied' });

    await expect(service.getCurrentPosition()).rejects.toThrow(GeolocationUnavailableError);
    // Spending seconds discovering a settled 'no' is the thing being avoided.
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('falls back to a watch when one-shot requests never answer', async () => {
    install();
    // The in-app browser case: the callback simply never fires.
    getCurrentPosition.mockImplementation((_ok: PositionCallback, onError: ErrorCallback) =>
      onError(failure(3)),
    );
    watchPosition.mockImplementation((onSuccess: PositionCallback) => {
      onSuccess(position(9.24, 125.97, 90));
      return 7;
    });

    const location = await service.getCurrentPosition();

    expect(location.latitude).toBe(9.24);
    expect(watchPosition).toHaveBeenCalled();
    // The watch must be released once it has answered.
    expect(clearWatch).toHaveBeenCalledWith(7);
  });

  it('gives up when neither a request nor a watch answers', async () => {
    install({ userAgent: MESSENGER_UA });
    getCurrentPosition.mockImplementation((_ok: PositionCallback, onError: ErrorCallback) =>
      onError(failure(3)),
    );
    watchPosition.mockImplementation((_ok: PositionCallback, onError: ErrorCallback) => {
      onError(failure(3));
      return 1;
    });

    const error = (await service
      .getCurrentPosition()
      .catch((thrown) => thrown)) as GeolocationUnavailableError;

    expect(error.reason).toBe('timeout');
    // In an in-app browser the only real fix is leaving it, so the caller is told.
    expect(error.suggestExternalBrowser).toBe(true);
    expect(error.message).toContain('Messenger');
  });

  it('stops after a denial rather than trying the other strategies', async () => {
    install();
    getCurrentPosition.mockImplementation((_ok: PositionCallback, onError: ErrorCallback) =>
      onError(failure(1)),
    );

    const error = (await service
      .getCurrentPosition()
      .catch((thrown) => thrown)) as GeolocationUnavailableError;

    expect(error.reason).toBe('permissionDenied');
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('does not suggest another browser for an ordinary denial', async () => {
    install();
    getCurrentPosition.mockImplementation((_ok: PositionCallback, onError: ErrorCallback) =>
      onError(failure(1)),
    );

    const error = (await service
      .getCurrentPosition()
      .catch((thrown) => thrown)) as GeolocationUnavailableError;

    // Someone who blocked the prompt in Chrome should fix it in Chrome.
    expect(error.suggestExternalBrowser).toBe(false);
  });

  it('builds an intent link on Android so the page can escape the in-app browser', () => {
    install({ userAgent: MESSENGER_UA });

    const link = service.externalBrowserLink();

    expect(link.isIntent).toBe(true);
    expect(link.href).toBe(
      'intent://spinner.test/#Intent;scheme=https;package=com.android.chrome;end',
    );
  });

  it('falls back to the plain address off Android', () => {
    install({ userAgent: 'Mozilla/5.0 (iPhone) [FBAN/MessengerLite]' });

    const link = service.externalBrowserLink();

    expect(link.isIntent).toBe(false);
    expect(link.href).toBe('https://spinner.test/');
  });

  it('recognises the in-app browsers customers actually arrive from', () => {
    install({ userAgent: MESSENGER_UA });
    expect(service.isInAppBrowser).toBe(true);

    // The check reads the user agent each time, so swapping it is enough; the
    // TestBed cannot be reconfigured once a service has been taken from it.
    vi.stubGlobal('navigator', {
      geolocation: { clearWatch, getCurrentPosition, watchPosition },
      userAgent: 'Mozilla/5.0 Chrome/120 Mobile Safari/537.36',
    });

    expect(service.isInAppBrowser).toBe(false);
  });
});
