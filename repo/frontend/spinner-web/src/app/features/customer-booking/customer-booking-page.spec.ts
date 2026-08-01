import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CustomerBookingPage } from './customer-booking-page';
import {
  DeviceLocationService,
  GeolocationUnavailableError,
} from '../../core/device-location.service';
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

const dryOnly = {
  basePrice: 90,
  deliveryFee: 60,
  description: null,
  id: 'service-2',
  name: 'Dry Only',
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
  distanceKm: 0,
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

  function createPage(catalogue: readonly (typeof service)[] = [service]) {
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
      .flush(catalogue);
    // The page also reads public settings to bias address search.
    http
      .expectOne((request) => request.url.endsWith('/api/business-settings'))
      .flush({
        businessName: 'Engr. Spin Laundry',
        hasPickupServiceArea: false,
        pickupOriginLatitude: null,
        pickupOriginLongitude: null,
        pickupServiceRadiusKm: 15,
      });
    fixture.detectChanges();

    const page = fixture.componentInstance;
    page.bookingForm.patchValue({
      address: CUSTOMER_ADDRESS,
      fullName: 'Kendra Mae',
      mobileNumber: '09171234567',
      preferredDate: '2026-08-05',
      preferredTime: '15:00-17:00',
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

  describe('per-service loads', () => {
    it('gives each chosen service its own quantity', () => {
      const { page } = createPage([service, dryOnly]);

      // Wash is preselected; add drying alongside it.
      page.toggleService(dryOnly.id);
      page.adjustServiceLoads(service.id, 1);
      page.adjustServiceLoads(service.id, 1);

      expect(page.serviceLoadCount(service.id)).toBe(3);
      expect(page.serviceLoadCount(dryOnly.id)).toBe(1);

      page.submitBooking();
      const payload = submittedPayload();

      expect(payload.services).toEqual([
        { quantity: 3, serviceId: service.id },
        { quantity: 1, serviceId: dryOnly.id },
      ]);
      // The legacy scalar carries the combined total for older consumers.
      expect(payload.loadCount).toBe(4);
    });

    it('prices each line on its own quantity and charges delivery once', () => {
      const { page } = createPage([service, dryOnly]);

      page.toggleService(dryOnly.id);
      page.adjustServiceLoads(service.id, 1);

      // 2 x 170 + 1 x 90
      expect(page.serviceAmount).toBe(430);
      expect(page.deliveryFee).toBe(60);
      expect(page.estimatedTotal).toBe(490);
      expect(page.loadCount()).toBe(3);
    });

    it('starts every newly chosen service at one load', () => {
      const { page } = createPage([service, dryOnly]);

      page.adjustServiceLoads(service.id, 4);
      page.toggleService(dryOnly.id);

      expect(page.serviceLoadCount(service.id)).toBe(5);
      expect(page.serviceLoadCount(dryOnly.id)).toBe(1);
    });

    it('forgets the quantity when a service is removed', () => {
      const { page } = createPage([service, dryOnly]);

      page.toggleService(dryOnly.id);
      page.adjustServiceLoads(dryOnly.id, 3);
      expect(page.serviceLoadCount(dryOnly.id)).toBe(4);

      // Unticking and reticking must not resurrect the old figure.
      page.toggleService(dryOnly.id);
      page.toggleService(dryOnly.id);

      expect(page.serviceLoadCount(dryOnly.id)).toBe(1);
    });

    it('never drops below one load or above the ceiling', () => {
      const { page } = createPage([service, dryOnly]);

      page.adjustServiceLoads(service.id, -5);
      expect(page.serviceLoadCount(service.id)).toBe(1);
      expect(page.canDecreaseLoads(service.id)).toBe(false);

      for (let index = 0; index < 40; index += 1) page.adjustServiceLoads(service.id, 1);
      expect(page.serviceLoadCount(service.id)).toBe(20);
      expect(page.canIncreaseLoads(service.id)).toBe(false);
    });

    it('ignores adjustments for a service that is not chosen', () => {
      const { page } = createPage([service, dryOnly]);

      page.adjustServiceLoads(dryOnly.id, 3);

      expect(page.serviceLoadCount(dryOnly.id)).toBe(1);
      expect(page.serviceLines().map((line) => line.id)).toEqual([service.id]);
    });

    it('renders a stepper only for chosen services', () => {
      const { fixture, page } = createPage([service, dryOnly]);

      expect(fixture.nativeElement.querySelectorAll('.load-stepper').length).toBe(1);

      page.toggleService(dryOnly.id);
      fixture.detectChanges();

      const steppers = fixture.nativeElement.querySelectorAll('.load-stepper');
      expect(steppers.length).toBe(2);
      // Each stepper reports its own line total, not a shared one.
      expect(steppers[0].querySelector('.load-amount').textContent).toContain('170');
      expect(steppers[1].querySelector('.load-amount').textContent).toContain('90');
    });

    it('keeps the stepper buttons out of the toggle so both stay reachable', () => {
      const { fixture } = createPage([service, dryOnly]);

      const stepButton = fixture.nativeElement.querySelector('.step-button');
      // A button nested in a button is invalid markup and unreachable by keyboard.
      expect(stepButton.closest('.service-toggle')).toBeNull();
    });
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
