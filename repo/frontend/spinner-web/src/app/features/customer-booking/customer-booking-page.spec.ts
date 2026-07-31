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
    city: 'Cabadbaran City',
    country: 'Philippines',
    countrycode: 'PH',
    name: 'Purok 3',
    osm_id: 999,
    osm_type: 'W',
    state: 'Agusan del Norte',
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

    return fixture;
  }

  function fillRequiredFields(page: CustomerBookingPage) {
    page.bookingForm.patchValue({
      fullName: 'Maria Santos',
      loadCount: 1,
      mobileNumber: '09171234567',
      preferredDate: '2026-08-01',
      preferredTime: '08:00-10:00',
      service: service.id,
    });
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

  afterEach(() => http.verify());

  it('submits without a pin when the customer only types an address', () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    fillRequiredFields(page);
    page.bookingForm.patchValue({ address: 'Purok 3, San Vicente' });

    page.submitBooking();

    const payload = submittedPayload();
    expect(payload.fulfillmentType).toBe('PickupAndDelivery');
    expect(payload.pickupLocation).toBeNull();
  });

  it('sends the pin captured from a chosen address suggestion', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    fillRequiredFields(page);

    page.onAddressInput({
      target: { value: 'Purok 3 San Vicente' },
    } as unknown as Event);
    await new Promise((resolve) => setTimeout(resolve, 400));
    http
      .expectOne((request) => request.url.includes('/api?'))
      .flush({ features: [suggestion] });

    page.applySuggestion(page.suggestions()[0]);
    page.bookingForm.patchValue({ landmark: 'Beside the blue gate' });
    expect(page.pinNeedsRecheck()).toBe(false);

    page.submitBooking();

    const location = submittedPayload().pickupLocation;
    expect(location).not.toBeNull();
    expect(location!.latitude).toBe(9.1256);
    expect(location!.longitude).toBe(125.5183);
    expect(location!.barangay).toBe('San Vicente');
    expect(location!.landmark).toBe('Beside the blue gate');
    expect(location!.locationSource).toBe('addressSearch');
    expect(location!.locationConfirmed).toBe(true);
  });

  it('flags the pin as unconfirmed when the address is edited afterwards', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    fillRequiredFields(page);

    page.onAddressInput({
      target: { value: 'Purok 3 San Vicente' },
    } as unknown as Event);
    await new Promise((resolve) => setTimeout(resolve, 400));
    http
      .expectOne((request) => request.url.includes('/api?'))
      .flush({ features: [suggestion] });
    page.applySuggestion(page.suggestions()[0]);

    page.onAddressInput({
      target: { value: 'Somewhere else entirely' },
    } as unknown as Event);
    await new Promise((resolve) => setTimeout(resolve, 400));
    http
      .expectOne((request) => request.url.includes('/api?'))
      .flush({ features: [] });

    expect(page.pinNeedsRecheck()).toBe(true);

    page.submitBooking();

    const location = submittedPayload().pickupLocation;
    expect(location!.locationConfirmed).toBe(false);
    expect(location!.confirmedAt).toBeNull();
  });

  it('never sends a pickup location for a drop-off booking', () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    fillRequiredFields(page);
    page.selectOrderMethod('dropOff');
    fixture.detectChanges();

    page.submitBooking();

    const payload = submittedPayload();
    expect(payload.fulfillmentType).toBe('DropOff');
    expect(payload.address).toBe('In-store');
    expect(payload.pickupLocation).toBeNull();
  });
});
