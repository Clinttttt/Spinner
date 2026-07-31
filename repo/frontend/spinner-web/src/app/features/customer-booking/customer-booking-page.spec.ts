import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CustomerBookingPage } from './customer-booking-page';
import { DeviceLocationService, GeolocationUnavailableError } from '../../core/device-location.service';
import {
  type CreateBookingPayload,
  type ServiceAreaCheckDto,
} from '../../core/spinner-api.service';

const service = {
  basePrice: 170,
  deliveryFee: 60,
  description: null,
  id: 'service-1',
  name: 'Wash, Dry & Fold',
  supportsPickupAndDelivery: true,
  unitLabel: 'per load',
};

const schoolSuggestion = {
  barangay: 'San Vicente',
  cityOrMunicipality: 'Madrid',
  formattedAddress: 'San Vicente Elementary School, Purok 1, Madrid, Surigao del Sur',
  latitude: 9.2381784,
  longitude: 125.9624521,
  placeId: 'W999',
  primaryText: 'San Vicente Elementary School',
  secondaryText: 'Purok 1, Madrid, Surigao del Sur',
};

/** The address the customer actually wrote, which no geocoder knows. */
const CUSTOMER_ADDRESS = 'Purok 3, third house past the blue gate, San Vicente, Madrid';

describe('CustomerBookingPage pickup location', () => {
  let http: HttpTestingController;
  let locationStub: {
    isSupported: boolean;
    isInAppBrowser: boolean;
    isSecureContext: boolean;
    getCurrentPosition: ReturnType<typeof vi.fn>;
  };

  function createPage() {
    locationStub = {
      getCurrentPosition: vi.fn(),
      isInAppBrowser: false,
      isSecureContext: true,
      isSupported: true,
    };

    TestBed.configureTestingModule({
      imports: [CustomerBookingPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DeviceLocationService, useValue: locationStub },
      ],
    });
    const fixture = TestBed.createComponent(CustomerBookingPage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http
      .expectOne((request) => request.url.includes('/api/services-pricing/services'))
      .flush([service]);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.bookingForm.patchValue({
      address: CUSTOMER_ADDRESS,
      fullName: 'Kendra Mae',
      loadCount: 1,
      mobileNumber: '09171234567',
      preferredDate: '2026-08-05',
      preferredTime: '15:00-17:00',
      service: service.id,
    });

    return { fixture, page };
  }

  function submittedPayload(): CreateBookingPayload {
    const request = http.expectOne(
      (candidate) => candidate.url.endsWith('/api/bookings') && candidate.method === 'POST',
    );
    const payload = request.request.body as CreateBookingPayload;
    request.flush({
      customerName: 'Kendra Mae',
      estimatedTotalAmount: 230,
      orderCode: 'ES-1',
      orderId: 'order-1',
      status: 'BookingReceived',
      trackingCode: 'TRK-1',
    });
    return payload;
  }

  /** Answers the optional reverse-geocode lookup, if one was issued. */
  function flushReverseIfAny(features: unknown[] = []) {
    const pending = http.match((request) => request.url.includes('/reverse?'));
    pending.forEach((request) => request.flush({ features }));
  }

  afterEach(() => http.verify());

  it('keeps the customer address when a suggestion only moves the pin', () => {
    const { page } = createPage();

    page.applySuggestion(schoolSuggestion);

    // The whole point: choosing "San Vicente Elementary School" must not
    // overwrite where the customer actually lives.
    expect(page.bookingForm.controls.address.value).toBe(CUSTOMER_ADDRESS);
    expect(page.locationStatus()).toBe('ready');
    expect(page.pickupPin()!.latitude).toBe(9.2381784);
    expect(page.pickupPin()!.source).toBe('addressSearch');

    page.submitBooking();
    const payload = submittedPayload();

    expect(payload.address).toBe(CUSTOMER_ADDRESS);
    expect(payload.pickupLocation!.formattedAddress).toBe(schoolSuggestion.formattedAddress);
    expect(payload.pickupLocation!.locationConfirmed).toBe(true);
  });

  it('records a point the customer chose by moving the map', () => {
    const { page } = createPage();

    // The map is visible from the start; dragging it sets the point.
    expect(page.mapVisible()).toBe(true);
    expect(page.pickupPin()).toBeNull();

    page.onMapPointChosen({ latitude: 9.24101, longitude: 125.96712 });
    flushReverseIfAny();

    expect(page.locationStatus()).toBe('ready');
    expect(page.pickupPin()!.source).toBe('manualPin');

    page.submitBooking();
    const location = submittedPayload().pickupLocation;

    expect(location!.latitude).toBe(9.24101);
    expect(location!.longitude).toBe(125.96712);
    expect(location!.locationSource).toBe('manualPin');
  });

  it('reports a geolocation failure without a pin as failed', async () => {
    const { page } = createPage();
    locationStub.getCurrentPosition.mockRejectedValue(
      new GeolocationUnavailableError('timeout', 'Finding your location took too long.'),
    );

    await page.useCurrentLocation();

    expect(page.locationStatus()).toBe('failed');
    expect(page.locationError()).toContain('took too long');
    expect(page.pickupPin()).toBeNull();

    page.submitBooking();
    // A GPS failure must never block the booking.
    expect(submittedPayload().pickupLocation).toBeNull();
  });

  it('never shows a saved pin and a failure at the same time', async () => {
    const { page } = createPage();
    page.applySuggestion(schoolSuggestion);
    expect(page.locationStatus()).toBe('ready');

    locationStub.getCurrentPosition.mockRejectedValue(
      new GeolocationUnavailableError('timeout', 'Finding your location took too long.'),
    );
    await page.useCurrentLocation();

    // The pin survives, and the state stays 'ready' rather than 'failed', so the
    // contradictory "pin saved" + "took too long" pairing cannot render.
    expect(page.locationStatus()).toBe('ready');
    expect(page.pickupPin()).not.toBeNull();

    page.submitBooking();
    expect(submittedPayload().pickupLocation).not.toBeNull();
  });

  it('captures the current location when geolocation succeeds', async () => {
    const { page } = createPage();
    locationStub.getCurrentPosition.mockResolvedValue({
      accuracyMeters: 18,
      latitude: 9.2399,
      longitude: 125.9655,
    });

    await page.useCurrentLocation();
    flushReverseIfAny();

    expect(page.locationStatus()).toBe('ready');
    expect(page.pickupPin()!.source).toBe('currentLocation');
    expect(page.pinSourceLabel()).toContain('18 m');

    page.submitBooking();
    const location = submittedPayload().pickupLocation;
    expect(location!.latitude).toBe(9.2399);
    expect(location!.locationSource).toBe('currentLocation');
  });

  it('clears the pin when the customer changes location', () => {
    const { page } = createPage();
    page.applySuggestion(schoolSuggestion);

    page.changeLocation();

    expect(page.pickupPin()).toBeNull();
    expect(page.locationStatus()).toBe('idle');
    expect(page.locationError()).toBe('');
  });

  it('never sends a pickup location for a drop-off booking', () => {
    const { fixture, page } = createPage();
    page.applySuggestion(schoolSuggestion);
    page.selectOrderMethod('dropOff');
    fixture.detectChanges();

    page.submitBooking();
    const payload = submittedPayload();

    expect(payload.fulfillmentType).toBe('DropOff');
    expect(payload.address).toBe('In-store');
    expect(payload.pickupLocation).toBeNull();
  });

  describe('service area', () => {
    /** Waits past the debounce and answers the area check. */
    async function flushAreaCheck(body: ServiceAreaCheckDto) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      http.expectOne((request) => request.url.includes('/api/service-area/check')).flush(body);
    }

    it('blocks submission when the pin is outside the pickup area', async () => {
      const { page } = createPage();
      page.applySuggestion(schoolSuggestion);

      await flushAreaCheck({
        allowsBooking: false,
        distanceKm: 48.2,
        maxRadiusKm: 15,
        message: 'This point is about 48.2 km away, outside our 15 km pickup area.',
        policy: 'radius',
        status: 'outside',
      });

      expect(page.outsideServiceArea()).toBe(true);

      page.submitBooking();

      // No booking request at all: the customer is told before anything is sent.
      http.expectNone((request) => request.url.endsWith('/api/bookings'));
      expect(page.errorMessage()).toContain('outside our 15 km pickup area');
    });

    it('allows submission when the pin is inside the pickup area', async () => {
      const { page } = createPage();
      page.applySuggestion(schoolSuggestion);

      await flushAreaCheck({
        allowsBooking: true,
        distanceKm: 2.4,
        maxRadiusKm: 15,
        message: 'This location is within our pickup area, about 2.4 km away.',
        policy: 'radius',
        status: 'inside',
      });

      expect(page.outsideServiceArea()).toBe(false);

      page.submitBooking();
      expect(submittedPayload().pickupLocation).not.toBeNull();
    });

    it('does not block booking when the area check itself fails', async () => {
      const { page } = createPage();
      page.applySuggestion(schoolSuggestion);

      await new Promise((resolve) => setTimeout(resolve, 500));
      http
        .expectOne((request) => request.url.includes('/api/service-area/check'))
        .error(new ProgressEvent('network error'));

      expect(page.outsideServiceArea()).toBe(false);

      page.submitBooking();
      expect(submittedPayload().pickupLocation).not.toBeNull();
    });

    it('says nothing about the area when none is configured', async () => {
      const { page } = createPage();
      page.applySuggestion(schoolSuggestion);

      await flushAreaCheck({
        allowsBooking: true,
        distanceKm: null,
        maxRadiusKm: null,
        message: 'Pickup area checking is not set up yet.',
        policy: 'unconfigured',
        status: 'notConfigured',
      });

      expect(page.outsideServiceArea()).toBe(false);

      page.submitBooking();
      expect(submittedPayload().pickupLocation).not.toBeNull();
    });

    it('clears the area verdict when the customer changes location', async () => {
      const { page } = createPage();
      page.applySuggestion(schoolSuggestion);
      await flushAreaCheck({
        allowsBooking: false,
        distanceKm: 48.2,
        maxRadiusKm: 15,
        message: 'Outside the pickup area.',
        policy: 'radius',
        status: 'outside',
      });
      expect(page.outsideServiceArea()).toBe(true);

      page.changeLocation();

      expect(page.serviceArea()).toBeNull();
      expect(page.outsideServiceArea()).toBe(false);
    });
  });
});
