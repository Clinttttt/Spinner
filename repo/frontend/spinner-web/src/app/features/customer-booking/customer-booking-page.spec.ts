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

  // The page now remembers a customer's details in localStorage, which jsdom shares
  // across every test in this file. Without this, a test that submits a booking leaves a
  // saved pin behind and the next page restores it, which is exactly what happened:
  // "reports a geolocation failure without a pin" found a pin and reported ready.
  beforeEach(() => {
    localStorage.clear();
  });

  function createPage(catalogue: readonly (typeof service)[] = [service], prefill = true) {
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

    // Skipped by the tests that assert what was restored from a previous booking, which
    // this would otherwise overwrite.
    if (prefill) {
      page.bookingForm.patchValue({
        address: CUSTOMER_ADDRESS,
        fullName: 'Kendra Mae',
        mobileNumber: '09171234567',
        preferredDate: '2026-08-05',
        preferredTime: '15:00-17:00',
      });
    }

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

    // The map is opt-in now, so opening it is itself a deliberate act.
    expect(page.mapVisible()).toBe(false);
    page.openMap();
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

  describe('pin is only ever captured deliberately', () => {
    it('sends no pickup location when the customer only types an address', () => {
      const { page } = createPage();

      // Exactly the reported case: a full written address, no suggestion chosen,
      // no map opened, no GPS.
      page.submitBooking();
      const payload = submittedPayload();

      expect(payload.address).toBe(CUSTOMER_ADDRESS);
      expect(payload.pickupLocation).toBeNull();
      expect(page.pickupPin()).toBeNull();
      expect(page.locationStatus()).toBe('idle');
    });

    it('does not render the map until the customer asks for it', () => {
      const { fixture, page } = createPage();

      // The map rendering unprompted is what allowed a page scroll over it to be
      // read as a deliberate pan and save a pin near the default centre.
      expect(page.mapVisible()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-location-picker-map')).toBeNull();

      page.openMap();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-location-picker-map')).not.toBeNull();
    });

    it('drops a map pin when the customer hides the map again', () => {
      const { page } = createPage();

      page.openMap();
      page.onMapPointChosen({ latitude: 9.24101, longitude: 125.96712 });
      flushReverseIfAny();
      expect(page.pickupPin()).not.toBeNull();

      page.closeMap();

      // No hidden coordinate may survive on the order.
      expect(page.pickupPin()).toBeNull();
      page.submitBooking();
      expect(submittedPayload().pickupLocation).toBeNull();
    });

    it('keeps a GPS pin when the map is hidden, because that was deliberate', async () => {
      const { page } = createPage();
      locationStub.getCurrentPosition.mockResolvedValue({
        accuracyMeters: 12,
        latitude: 9.2401,
        longitude: 125.9671,
      });

      await page.useCurrentLocation();
      flushReverseIfAny();
      page.closeMap();

      expect(page.pickupPin()!.source).toBe('currentLocation');
    });

    it('still records a pin the customer chose from a suggestion', () => {
      const { page } = createPage();

      page.applySuggestion(schoolSuggestion);

      expect(page.pickupPin()!.source).toBe('addressSearch');
      // And it becomes visible, so it can be checked or corrected.
      expect(page.mapVisible()).toBe(true);
    });
  });

  describe('how trustworthy the pin is', () => {
    it('asks the customer to move a vague pin onto their house', async () => {
      const { fixture, page } = createPage();
      locationStub.getCurrentPosition.mockResolvedValue({
        accuracyMeters: 850,
        latitude: 9.24,
        longitude: 125.97,
      });

      await page.useCurrentLocation();
      flushReverseIfAny();
      fixture.detectChanges();

      // A network fix this vague is what landed the pin on a neighbour's house.
      expect(page.pinAccuracyLabel()).toContain('move the pin onto your house');
      expect(fixture.nativeElement.textContent).toContain('move the pin onto your house');
    });

    it('simply states the accuracy when the fix is tight', async () => {
      const { page } = createPage();
      locationStub.getCurrentPosition.mockResolvedValue({
        accuracyMeters: 8,
        latitude: 9.24,
        longitude: 125.97,
      });

      await page.useCurrentLocation();
      flushReverseIfAny();

      expect(page.pinAccuracyLabel()).toBe('Accurate to about 8 m');
    });

    it('says nothing when the device reports no accuracy', () => {
      const { page } = createPage();
      page.onMapPointChosen({ latitude: 9.24, longitude: 125.97 });
      flushReverseIfAny();

      // A hand-placed pin has no accuracy figure and needs no caveat.
      expect(page.pinAccuracyLabel()).toBeNull();
    });
  });

  describe('tracking an existing order', () => {
    it('asks for the code in the page rather than a browser prompt', () => {
      const { fixture, page } = createPage();
      const prompt = vi.spyOn(window, 'prompt');

      page.openTrackingLookup();
      fixture.detectChanges();

      // window.prompt shows the browser's own dialog with the hostname, and some
      // in-app browsers suppress it entirely so the button did nothing.
      expect(prompt).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('#tracking-code')).not.toBeNull();
      prompt.mockRestore();
    });

    it('shows the order status for a real code', () => {
      const { fixture, page } = createPage();
      page.openTrackingLookup();
      page.trackingCodeInput.set('ES-20260804-001');
      page.lookUpOrder();

      http
        .expectOne((request) => request.url.includes('/api/bookings/ES-20260804-001/confirmation'))
        .flush({
          customerName: 'Viz Goc',
          estimatedTotalAmount: 230,
          orderCode: 'ES-20260804-001',
          orderId: 'order-1',
          status: 'BookingReceived',
          trackingCode: 'TRK-1',
        });
      fixture.detectChanges();

      expect(page.trackingLookupOpen()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('ES-20260804-001');
    });

    it('explains an unknown code without closing the dialog', () => {
      const { page } = createPage();
      page.openTrackingLookup();
      page.trackingCodeInput.set('ES-nope');
      page.lookUpOrder();

      http
        .expectOne((request) => request.url.includes('/confirmation'))
        .flush({ detail: 'not found' }, { status: 404, statusText: 'Not Found' });

      // Kept open so the code can be corrected without starting over.
      expect(page.trackingLookupOpen()).toBe(true);
      expect(page.trackingError()).toContain('No order found');
      expect(page.trackingLooking()).toBe(false);
    });

    it('does not call the API for an empty code', () => {
      const { page } = createPage();
      page.openTrackingLookup();
      page.lookUpOrder();

      http.expectNone((request) => request.url.includes('/confirmation'));
      expect(page.trackingError()).toContain('Enter the order code');
    });
  });

  describe('dismissing the suggestions', () => {
    it('closes when the customer taps outside the address block', () => {
      const { fixture, page } = createPage();
      page.suggestions.set([schoolSuggestion]);
      page.suggestionsOpen.set(true);
      fixture.detectChanges();

      // The list used to sit over the payment section with no way past it.
      document
        .querySelector('.form-section')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      fixture.detectChanges();

      expect(page.suggestionsOpen()).toBe(false);
    });

    it('stays open while the customer is still working in the address block', () => {
      const { fixture, page } = createPage();
      page.suggestions.set([schoolSuggestion]);
      page.suggestionsOpen.set(true);
      fixture.detectChanges();

      fixture.nativeElement
        .querySelector('.address-field')
        ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      fixture.detectChanges();

      expect(page.suggestionsOpen()).toBe(true);
    });

    it('offers an explicit way to hide the list', () => {
      const { fixture, page } = createPage();
      page.suggestions.set([schoolSuggestion]);
      page.suggestionsOpen.set(true);
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('.suggestion-dismiss') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(page.suggestionsOpen()).toBe(false);
    });
  });

  describe('after a booking is confirmed', () => {
    it('clears the form so the next customer starts fresh', () => {
      const { page } = createPage();
      page.onMapPointChosen({ latitude: 9.24101, longitude: 125.96712 });
      flushReverseIfAny();

      page.submitBooking();
      submittedPayload();
      expect(page.bookingComplete()).toBe(true);

      page.closeConfirmation();

      // A shared phone at the counter must not keep the last customer's details.
      expect(page.bookingForm.controls.fullName.value).toBe('');
      expect(page.bookingForm.controls.mobileNumber.value).toBe('');
      expect(page.bookingForm.controls.address.value).toBe('');
      expect(page.bookingForm.controls.preferredDate.value).toBe('');
      expect(page.pickupPin()).toBeNull();
      expect(page.mapVisible()).toBe(false);
      expect(page.submittedSummary()).toBeNull();
      // Untouched, so a blank form does not show required errors.
      expect(page.bookingForm.controls.fullName.touched).toBe(false);
    });

    it('goes back to the top of the page', () => {
      const { page } = createPage();
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

      page.submitBooking();
      submittedPayload();
      page.closeConfirmation();

      // The confirmation closes with the viewport near the bottom, which reads as a
      // half-filled form rather than a new one.
      expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', top: 0 });
      scrollTo.mockRestore();
    });

    it('reselects the first service, matching a freshly loaded page', () => {
      const { page } = createPage();
      page.submitBooking();
      submittedPayload();
      page.closeConfirmation();

      expect(page.selectedServiceIds()).toEqual([service.id]);
      expect(page.serviceLoadCount(service.id)).toBe(1);
    });
  });

  describe('form field behaviour', () => {
    it('says nothing about suggestions until there are some', () => {
      const { fixture, page } = createPage();

      // Three lines of instructions about a list that is not on screen is noise.
      expect(fixture.nativeElement.textContent).not.toContain('only moves the map pin');

      page.suggestions.set([schoolSuggestion]);
      page.suggestionsOpen.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.suggestion').length).toBe(1);
      expect(fixture.nativeElement.textContent).toContain('only moves the map pin');
    });

    it('hides the suggestion list when a search returns nothing', () => {
      const { fixture, page } = createPage();

      page.suggestions.set([]);
      page.suggestionsOpen.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.suggestion-list')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('only moves the map pin');
    });

    it('prompts an empty date field, because the browser shows a blank box', () => {
      const { fixture, page } = createPage();
      page.bookingForm.controls.preferredDate.setValue('');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.date-prompt')?.textContent).toContain(
        'Select a date',
      );

      page.bookingForm.controls.preferredDate.setValue('2026-08-05');
      fixture.detectChanges();

      // Once chosen, the native value speaks for itself.
      expect(fixture.nativeElement.querySelector('.date-prompt')).toBeNull();
    });

    it('does not let the address box be dragged out of shape', () => {
      const { fixture } = createPage();
      const address = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

      // The drag handle sat where a thumb lands when scrolling past the field.
      expect(getComputedStyle(address).resize).toBe('none');
    });
  });

  describe('paying by QR', () => {
    it('opens a checkout instead of creating a booking', () => {
      const { page } = createPage();
      const assign = vi.fn();
      vi.spyOn(window, 'location', 'get').mockReturnValue({
        ...window.location,
        assign,
      } as unknown as Location);

      page.selectPayment('qr');
      page.submitBooking();

      // No order may exist before the money does.
      http.expectNone((request) => request.url.endsWith('/api/bookings'));
      const checkout = http.expectOne(
        (request) => request.url.endsWith('/api/bookings/checkout') && request.method === 'POST',
      );
      expect(checkout.request.body.paymentMethod).toBe('QrCodeOnlinePayment');

      checkout.flush({
        amount: 400,
        checkoutUrl: 'https://checkout.paymongo.test/abc',
        currency: 'PHP',
        reference: 'PAY-20260802-ABCDEFGHJK',
      });

      expect(assign).toHaveBeenCalledWith('https://checkout.paymongo.test/abc');
      vi.restoreAllMocks();
    });

    it('keeps the customer on the form when the checkout cannot open', () => {
      const { page } = createPage();

      page.selectPayment('qr');
      page.submitBooking();

      http
        .expectOne((request) => request.url.endsWith('/api/bookings/checkout'))
        .flush(
          { detail: 'Online payment is not available right now.' },
          { status: 409, statusText: 'Conflict' },
        );

      expect(page.errorMessage()).toContain('not available');
      // Still usable, so the customer can switch to Cash on Delivery.
      expect(page.submitting()).toBe(false);
    });

    it('still creates the booking directly for cash on delivery', () => {
      const { page } = createPage();

      page.submitBooking();

      http.expectNone((request) => request.url.endsWith('/api/bookings/checkout'));
      expect(submittedPayload().paymentMethod).toBe('CashOnDelivery');
    });
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

  describe('remembering a returning customer', () => {
    const STORAGE_KEY = 'spinner.customer.last-booking.v1';

    function storeDetails(overrides: Record<string, unknown> = {}, savedAt = new Date()) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          address: 'Purok 3, San Vicente, Madrid',
          email: 'kendra@example.com',
          fullName: 'Kendra Mae',
          landmark: 'Third house past the blue gate',
          mobileNumber: '09171234567',
          orderMethod: 'pickupDelivery',
          paymentMethod: 'cod',
          pickupPin: null,
          preferredTime: '15:00-17:00',
          savedAt: savedAt.toISOString(),
          ...overrides,
        }),
      );
    }

    it('fills the form from the last booking made in this browser', () => {
      storeDetails();

      const { page } = createPage([service], false);

      expect(page.detailsRestored()).toBe(true);
      expect(page.bookingForm.controls.fullName.value).toBe('Kendra Mae');
      expect(page.bookingForm.controls.mobileNumber.value).toBe('09171234567');
      expect(page.bookingForm.controls.email.value).toBe('kendra@example.com');
      expect(page.bookingForm.controls.address.value).toBe('Purok 3, San Vicente, Madrid');
      expect(page.bookingForm.controls.landmark.value).toBe('Third house past the blue gate');
    });

    it('leaves the date to be chosen again, because a remembered one is in the past', () => {
      storeDetails();

      const { page } = createPage([service], false);

      expect(page.bookingForm.controls.preferredDate.value).toBe('');
    });

    it('does not let stored details change which services are selected', () => {
      // The page preselects the first service by design so the estimate is never empty.
      // What matters here is that a previous booking cannot add to that: a service the
      // customer is not looking at is a charge they did not choose on this visit, and
      // unlike a wrong name it would not be obvious on the page.
      storeDetails();

      const { page } = createPage([service, dryOnly], false);

      expect(page.isServiceSelected(service.id)).toBe(true);
      expect(page.isServiceSelected(dryOnly.id)).toBe(false);
    });

    it('restores a pickup pin and re-checks it against the area as it stands now', () => {
      storeDetails({
        pickupPin: {
          accuracyMeters: null,
          formattedAddress: 'San Vicente, Surigao del Sur',
          latitude: 9.224,
          longitude: 126.0079,
          placeId: null,
          source: 'manualPin',
        },
      });

      const { page } = createPage([service], false);

      expect(page.pickupPin()).not.toBeNull();
      expect(page.pickupPin()!.latitude).toBeCloseTo(9.224);
      // Asked again rather than trusting last visit's verdict: the shop can change
      // its service area between bookings.
      expect(page.checkingServiceArea()).toBe(true);
    });

    it('forgets the details and empties the fields when the customer is not that person', () => {
      storeDetails();

      const { page } = createPage([service], false);
      page.forgetSavedDetails();

      expect(page.detailsRestored()).toBe(false);
      expect(page.bookingForm.controls.fullName.value).toBe('');
      expect(page.bookingForm.controls.mobileNumber.value).toBe('');
      expect(page.bookingForm.controls.address.value).toBe('');
      expect(page.pickupPin()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('ignores details old enough that the address may no longer be right', () => {
      const thirteenMonthsAgo = new Date(Date.now() - 400 * 86_400_000);
      storeDetails({}, thirteenMonthsAgo);

      const { page } = createPage([service], false);

      expect(page.detailsRestored()).toBe(false);
      expect(page.bookingForm.controls.fullName.value).toBe('');
      // Dropped rather than left to fail again on the next visit.
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('survives hand-edited storage instead of failing to load the page', () => {
      localStorage.setItem(STORAGE_KEY, '{ this is not json');

      const { page } = createPage([service], false);

      expect(page.detailsRestored()).toBe(false);
      expect(page.bookingForm.controls.fullName.value).toBe('');
    });

    it('remembers the details once a booking is submitted', () => {
      const { page } = createPage();
      page.submitBooking();
      submittedPayload();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      expect(stored.fullName).toBe('Kendra Mae');
      expect(stored.mobileNumber).toBe('09171234567');
      expect(stored.address).toBe(CUSTOMER_ADDRESS);
      // The date is deliberately not part of what is kept.
      expect(stored.preferredDate).toBeUndefined();
    });
  });
});
