import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CustomerBookingPage } from './customer-booking-page';
import { type CreateBookingPayload } from '../../core/spinner-api.service';

const service = {
  basePrice: 170,
  deliveryFee: 60,
  description: null,
  id: 'service-1',
  name: 'Wash, Dry & Fold',
  supportsPickupAndDelivery: true,
  unitLabel: 'per load',
};

const suggestion = {
  geometry: { coordinates: [125.5183, 9.1256] },
  properties: {
    city: 'Madrid',
    country: 'Philippines',
    countrycode: 'PH',
    name: 'San Vicente Elementary School',
    osm_id: 999,
    osm_type: 'W',
    state: 'Surigao del Sur',
    suburb: 'San Vicente',
  },
};

describe('CustomerBookingPage pickup location', () => {
  let http: HttpTestingController;

  function createPage() {
    TestBed.configureTestingModule({
      imports: [CustomerBookingPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
      fullName: 'Maria Santos',
      loadCount: 1,
      mobileNumber: '09171234567',
      preferredDate: '2026-08-01',
      preferredTime: '08:00-10:00',
      service: service.id,
    });

    return { fixture, page };
  }

  function flushGeocode(features: unknown[]) {
    http.expectOne((request) => request.url.includes('/api?')).flush({ features });
  }

  function submittedPayload(): CreateBookingPayload {
    const request = http.expectOne(
      (candidate) => candidate.url.endsWith('/api/bookings') && candidate.method === 'POST',
    );
    const payload = request.request.body as CreateBookingPayload;
    request.flush({
      customerName: 'Maria Santos',
      estimatedTotalAmount: 230,
      orderCode: 'ES-1',
      orderId: 'order-1',
      status: 'BookingReceived',
      trackingCode: 'TRK-1',
    });
    return payload;
  }

  /** Types into the address box the way a customer does. */
  function typeAddress(page: CustomerBookingPage, value: string) {
    page.bookingForm.patchValue({ address: value });
    page.onAddressInput({ target: { value } } as unknown as Event);
  }

  afterEach(() => http.verify());

  it('resolves a typed address on submit so the owner still gets a pin', async () => {
    const { page } = createPage();
    typeAddress(page, 'San Vicente Madrid Surigao del Sur');
    // The keystroke lookup is debounced and never fires in this test.
    http.expectNone((request) => request.url.includes('/api?'));

    const pending = page.submitBooking();
    flushGeocode([suggestion]);
    await pending;

    const location = submittedPayload().pickupLocation;
    expect(location).not.toBeNull();
    expect(location!.latitude).toBe(9.1256);
    expect(location!.longitude).toBe(125.5183);
    expect(location!.locationSource).toBe('addressSearch');
    // An approximation from typed text must not claim to be confirmed.
    expect(location!.locationConfirmed).toBe(false);
    expect(location!.confirmedAt).toBeNull();
  });

  it('still submits when the geocoder finds nothing', async () => {
    const { page } = createPage();
    typeAddress(page, 'Purok sa likod ng basketball court');

    const pending = page.submitBooking();
    flushGeocode([]);
    await pending;

    const payload = submittedPayload();
    expect(payload.pickupLocation).toBeNull();
    expect(payload.address).toBe('Purok sa likod ng basketball court');
  });

  it('sends a confirmed pin when the customer picks a suggestion', async () => {
    const { page } = createPage();
    typeAddress(page, 'San Vicente Madrid');
    page.applySuggestion({
      barangay: 'San Vicente',
      cityOrMunicipality: 'Madrid',
      formattedAddress: 'San Vicente Elementary School, San Vicente, Madrid',
      latitude: 9.1256,
      longitude: 125.5183,
      placeId: 'W999',
      primaryText: 'San Vicente Elementary School',
      secondaryText: 'San Vicente, Madrid',
    });
    page.bookingForm.patchValue({ landmark: 'Beside the blue gate' });
    expect(page.pinNeedsRecheck()).toBe(false);

    // A chosen pin means no lookup happens on submit.
    await page.submitBooking();

    const location = submittedPayload().pickupLocation;
    expect(location!.locationConfirmed).toBe(true);
    expect(location!.landmark).toBe('Beside the blue gate');
    expect(location!.barangay).toBe('San Vicente');
  });

  it('flags the pin as unconfirmed when the address is edited afterwards', async () => {
    const { page } = createPage();
    page.applySuggestion({
      barangay: 'San Vicente',
      cityOrMunicipality: 'Madrid',
      formattedAddress: 'San Vicente Elementary School, San Vicente, Madrid',
      latitude: 9.1256,
      longitude: 125.5183,
      placeId: 'W999',
      primaryText: 'San Vicente Elementary School',
      secondaryText: 'San Vicente, Madrid',
    });

    typeAddress(page, 'Somewhere else entirely');
    expect(page.pinNeedsRecheck()).toBe(true);

    await page.submitBooking();

    const location = submittedPayload().pickupLocation;
    expect(location!.locationConfirmed).toBe(false);
    expect(location!.confirmedAt).toBeNull();
  });

  it('never sends a pickup location for a drop-off booking', async () => {
    const { fixture, page } = createPage();
    page.selectOrderMethod('dropOff');
    fixture.detectChanges();

    await page.submitBooking();

    const payload = submittedPayload();
    expect(payload.fulfillmentType).toBe('DropOff');
    expect(payload.address).toBe('In-store');
    expect(payload.pickupLocation).toBeNull();
  });
});
