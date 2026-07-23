import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  type BookingConfirmationDto,
  type LaundryServiceDto,
  SpinnerApiService,
} from '../../core/spinner-api.service';

type OrderMethod = 'pickupDelivery' | 'dropOff';
type PaymentMethod = 'cod' | 'qr';

interface ChoiceOption<T extends string> {
  caption: string;
  title: string;
  value: T;
}

@Component({
  selector: 'app-customer-booking-page',
  imports: [ReactiveFormsModule],
  templateUrl: './customer-booking-page.html',
  styleUrl: './customer-booking-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerBookingPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly api = inject(SpinnerApiService);

  readonly bookingComplete = signal(false);
  readonly trackingNoticeVisible = signal(false);
  readonly services = signal<readonly LaundryServiceDto[]>([]);
  readonly loadingServices = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly confirmation = signal<BookingConfirmationDto | null>(null);
  readonly minimumDate = this.toDateInputValue(new Date());

  readonly orderMethods: readonly ChoiceOption<OrderMethod>[] = [
    {
      caption: 'We collect and return your laundry',
      title: 'Pickup & Delivery',
      value: 'pickupDelivery',
    },
    {
      caption: 'Bring your laundry to our shop',
      title: 'Drop-off',
      value: 'dropOff',
    },
  ];

  readonly paymentMethods: readonly ChoiceOption<PaymentMethod>[] = [
    {
      caption: 'Pay when your order arrives',
      title: 'Cash on Delivery',
      value: 'cod',
    },
    {
      caption: 'Receive a secure QR payment link',
      title: 'QR Online Payment',
      value: 'qr',
    },
  ];

  readonly bookingForm = this.formBuilder.nonNullable.group({
    service: this.formBuilder.nonNullable.control('', Validators.required),
    orderMethod: this.formBuilder.nonNullable.control<OrderMethod>('pickupDelivery'),
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
    email: ['', Validators.email],
    preferredDate: ['', Validators.required],
    preferredTime: ['', Validators.required],
    loadCount: [1, [Validators.required, Validators.min(1)]],
    notes: [''],
    paymentMethod: this.formBuilder.nonNullable.control<PaymentMethod>('cod'),
    address: ['', Validators.required],
  });

  constructor() {
    this.loadServices();
    this.bookingForm.controls.orderMethod.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((method) => {
        const address = this.bookingForm.controls.address;
        if (method === 'pickupDelivery') address.addValidators(Validators.required);
        else address.clearValidators();
        address.updateValueAndValidity({ emitEvent: false });
      });
  }

  get selectedService() {
    return this.services().find((service) => service.id === this.bookingForm.controls.service.value);
  }

  get serviceAmount(): number {
    return (this.selectedService?.basePrice ?? 0) * Number(this.bookingForm.controls.loadCount.value);
  }

  get deliveryFee(): number {
    return this.bookingForm.controls.orderMethod.value === 'pickupDelivery'
      ? (this.selectedService?.deliveryFee ?? 0)
      : 0;
  }

  get estimatedTotal(): number {
    return this.serviceAmount + this.deliveryFee;
  }

  selectService(value: string): void {
    this.bookingForm.controls.service.setValue(value);
  }

  selectOrderMethod(value: OrderMethod): void {
    this.bookingForm.controls.orderMethod.setValue(value);
  }

  selectPayment(value: PaymentMethod): void {
    this.bookingForm.controls.paymentMethod.setValue(value);
  }

  hasError(
    controlName:
      | 'address'
      | 'email'
      | 'fullName'
      | 'mobileNumber'
      | 'preferredDate'
      | 'preferredTime',
  ): boolean {
    const control = this.bookingForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  submitBooking(): void {
    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.field-control.ng-invalid')?.focus(),
      );
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);
    const value = this.bookingForm.getRawValue();
    this.api
      .createBooking({
        additionalNotes: value.notes.trim() || null,
        address: value.orderMethod === 'pickupDelivery' ? value.address.trim() : 'In-store',
        emailAddress: value.email.trim() || null,
        fulfillmentType:
          value.orderMethod === 'pickupDelivery' ? 'PickupAndDelivery' : 'DropOff',
        fullName: value.fullName.trim(),
        loadCount: Number(value.loadCount),
        mobileNumber: value.mobileNumber.replace(/\s+/g, ''),
        paymentMethod: value.paymentMethod === 'qr' ? 'QrCodeOnlinePayment' : 'CashOnDelivery',
        preferredDate: value.preferredDate,
        preferredTimeWindow: value.preferredTime,
        serviceId: value.service,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (confirmation) => {
          this.confirmation.set(confirmation);
          this.bookingComplete.set(true);
        },
        error: (error: { error?: { detail?: string; title?: string } }) =>
          this.errorMessage.set(
            error.error?.detail ??
              error.error?.title ??
              'We could not submit your booking. Check your connection and try again.',
          ),
      });
  }

  showTrackingNotice(): void {
    const orderCode = window.prompt('Enter your order code');
    if (!orderCode?.trim()) return;
    this.errorMessage.set('');
    this.api
      .getBookingConfirmation(orderCode.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (confirmation) => {
          this.confirmation.set(confirmation);
          this.trackingNoticeVisible.set(true);
        },
        error: () => this.errorMessage.set('We could not find that order code.'),
      });
  }

  closeConfirmation(): void {
    this.bookingComplete.set(false);
  }

  private loadServices() {
    this.api
      .getServices()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingServices.set(false)),
      )
      .subscribe({
        next: (services) => {
          this.services.set(services);
          if (services.length) this.bookingForm.controls.service.setValue(services[0].id);
        },
        error: () =>
          this.errorMessage.set(
            'Services are temporarily unavailable. Please try again in a moment.',
          ),
      });
  }

  private toDateInputValue(date: Date): string {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 10);
  }
}
