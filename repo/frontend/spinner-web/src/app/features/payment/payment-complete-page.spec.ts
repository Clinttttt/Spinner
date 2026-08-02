import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';

import { PaymentCompletePage } from './payment-complete-page';
import { type BookingCheckoutStatusDto } from '../../core/spinner-api.service';

const PAID: BookingCheckoutStatusDto = {
  address: 'Purok 4, San Vicente, Carmen',
  amount: 400,
  businessAddress: 'Madrid, Surigao del Sur',
  businessName: 'Engr. Spin Laundry',
  checkoutUrl: null,
  currency: 'PHP',
  customerName: 'Clint Villanueva',
  deliveryFee: 60,
  fulfillmentType: 'PickupAndDelivery',
  landmark: 'Beside the blue gate',
  mobileNumber: '09384326772',
  orderCode: 'ES-20260802-001',
  preferredDate: '2026-08-04',
  preferredTimeWindow: '08:00-10:00',
  reference: 'PAY-20260802-ABCDEFGHJK',
  serviceAmount: 340,
  services: [{ name: 'Wash, Dry & Fold', quantity: 2, subtotal: 340, unitLabel: 'load' }],
  state: 'paid',
  trackingCode: 'TRK-1',
};

describe('PaymentCompletePage', () => {
  let http: HttpTestingController;

  function createPage(reference: string | null) {
    TestBed.configureTestingModule({
      imports: [PaymentCompletePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(reference ? { ref: reference } : {}),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(PaymentCompletePage);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return fixture;
  }

  function flushStatus(status: BookingCheckoutStatusDto) {
    http.expectOne((request) => request.url.includes('/api/bookings/checkout/')).flush(status);
  }

  it('confirms a paid pickup booking and says what happens next', () => {
    const fixture = createPage(PAID.reference);
    flushStatus(PAID);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Payment received');
    expect(text).toContain('ES-20260802-001');
    expect(text).toContain('We will collect your laundry');
    expect(text).toContain('Purok 4, San Vicente, Carmen');
    expect(text).toContain('Beside the blue gate');
    expect(text).toContain('09384326772');
    // Priced "per load", so the quantity must read as a count, not "2 per load".
    expect(text).toContain('2 loads');
    expect(text).not.toContain('2 per load');
    // The receipt totals 340 + 60.
    expect(text).toContain('400.00');
  });

  it('writes a single load without pluralising', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({
      ...PAID,
      services: [{ name: 'Dry Only', quantity: 1, subtotal: 90, unitLabel: 'per load' }],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 load');
    expect(text).not.toContain('1 loads');
  });

  it('tells a drop-off customer to bring the laundry in', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({
      ...PAID,
      address: 'In-store',
      deliveryFee: 0,
      fulfillmentType: 'DropOff',
      landmark: null,
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bring your laundry to');
    expect(text).toContain('Madrid, Surigao del Sur');
    expect(text).not.toContain('We will collect your laundry');
  });

  it('does not claim success while the payment is still settling', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({ ...PAID, orderCode: null, state: 'confirming' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    // Arriving from the provider's redirect proves nothing on its own.
    expect(text).toContain('Confirming your payment');
    expect(text).not.toContain('Payment received');
  });

  it('says plainly that nothing was charged when the payment failed', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({ ...PAID, orderCode: null, state: 'failed' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('did not go through');
    expect(text).toContain('Nothing was charged');
  });

  it('offers the checkout again when the booking is still unpaid', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({
      ...PAID,
      checkoutUrl: 'https://checkout.paymongo.test/abc',
      orderCode: null,
      state: 'awaitingPayment',
    });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.primary') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://checkout.paymongo.test/abc');
  });

  it('handles an expired link without alarming the customer about money', () => {
    const fixture = createPage(PAID.reference);
    flushStatus({ ...PAID, checkoutUrl: null, orderCode: null, state: 'expired' });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('expired');
    expect(text).toContain('Nothing was charged');
  });

  it('asks for nothing when the link has no reference', () => {
    const fixture = createPage(null);
    fixture.detectChanges();

    http.expectNone(() => true);
    expect(fixture.nativeElement.textContent).toContain('could not find that payment');
  });

  it('does not reveal a booking for an unknown reference', () => {
    const fixture = createPage('PAY-20260101-GUESSEDXXX');
    http
      .expectOne((request) => request.url.includes('/api/bookings/checkout/'))
      .flush({ detail: 'not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('could not find that payment');
  });

  afterEach(() => http.verify());
});
