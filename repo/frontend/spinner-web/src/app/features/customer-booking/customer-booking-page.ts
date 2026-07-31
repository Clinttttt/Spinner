import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs';

import {
  type AddressSuggestion,
  AddressLookupService,
} from '../../core/address-lookup.service';
import { DeviceLocationService } from '../../core/device-location.service';
import {
  type BookingConfirmationDto,
  type LaundryServiceDto,
  type PickupLocationPayload,
  SpinnerApiService,
} from '../../core/spinner-api.service';

type OrderMethod = 'pickupDelivery' | 'dropOff';
type PaymentMethod = 'cod' | 'qr';
type PinSource = 'currentLocation' | 'addressSearch';

interface ChoiceOption<T extends string> {
  caption: string;
  title: string;
  value: T;
}

interface PickupPin {
  accuracyMeters: number | null;
  /**
   * True when the pin was resolved from the typed address on submit rather than
   * chosen or captured by the customer. Such a pin is sent as unconfirmed so the
   * owner treats it as an approximation.
   */
  autoResolved: boolean;
  barangay: string | null;
  cityOrMunicipality: string | null;
  /** Address text at the moment the pin was captured. */
  capturedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  source: PinSource;
}

const SUGGESTION_DEBOUNCE_MS = 320;

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
  private readonly addressLookup = inject(AddressLookupService);
  private readonly deviceLocation = inject(DeviceLocationService);
  private readonly addressQuery = new Subject<string>();

  readonly bookingComplete = signal(false);
  readonly trackingNoticeVisible = signal(false);
  readonly services = signal<readonly LaundryServiceDto[]>([]);
  readonly loadingServices = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly confirmation = signal<BookingConfirmationDto | null>(null);
  readonly minimumDate = this.toDateInputValue(new Date());

  readonly suggestions = signal<readonly AddressSuggestion[]>([]);
  readonly suggestionsOpen = signal(false);
  readonly searchingAddress = signal(false);
  readonly activeSuggestionIndex = signal(-1);
  readonly locatingDevice = signal(false);
  readonly locationMessage = signal('');
  readonly locationError = signal('');
  readonly pickupPin = signal<PickupPin | null>(null);
  readonly geolocationSupported = this.deviceLocation.isSupported;

  /**
   * Mirrors the address control so signal-based state can react to edits.
   * A `computed` cannot track a FormControl value directly.
   */
  private readonly addressText = signal('');

  /**
   * True when the address text was edited after the pin was captured, so the
   * saved coordinates may no longer describe what the customer typed.
   */
  readonly pinNeedsRecheck = computed(() => {
    const pin = this.pickupPin();
    if (!pin) return false;
    return normalize(pin.capturedAddress) !== normalize(this.addressText());
  });

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
    landmark: [''],
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
        if (method !== 'pickupDelivery') this.closeSuggestions();
      });

    this.addressQuery
      .pipe(
        debounceTime(SUGGESTION_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => this.addressLookup.search(query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.searchingAddress.set(false);
        this.suggestions.set(results);
        this.activeSuggestionIndex.set(-1);
        this.suggestionsOpen.set(results.length > 0);
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

  onAddressInput(event: Event): void {
    // Read the element directly rather than the form control so this never
    // depends on which `input` listener Angular happens to run first.
    const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.addressText.set(value);
    this.locationError.set('');

    if (value.trim().length < 3) {
      this.closeSuggestions();
      this.searchingAddress.set(false);
      return;
    }

    this.searchingAddress.set(true);
    this.addressQuery.next(value);
  }

  onAddressKeydown(event: KeyboardEvent): void {
    if (!this.suggestionsOpen() || this.suggestions().length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const total = this.suggestions().length;
      this.activeSuggestionIndex.set(
        (this.activeSuggestionIndex() + step + total) % total,
      );
      return;
    }

    if (event.key === 'Enter') {
      const active = this.suggestions()[this.activeSuggestionIndex()];
      if (active) {
        event.preventDefault();
        this.applySuggestion(active);
      }
      return;
    }

    if (event.key === 'Escape') this.closeSuggestions();
  }

  applySuggestion(suggestion: AddressSuggestion): void {
    this.setAddress(suggestion.formattedAddress);
    this.pickupPin.set({
      accuracyMeters: null,
      autoResolved: false,
      barangay: suggestion.barangay,
      capturedAddress: suggestion.formattedAddress,
      cityOrMunicipality: suggestion.cityOrMunicipality,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: suggestion.placeId,
      source: 'addressSearch',
    });
    this.locationMessage.set('Map pin saved from the selected address.');
    this.locationError.set('');
    this.closeSuggestions();
  }

  private setAddress(value: string): void {
    const control = this.bookingForm.controls.address;
    control.setValue(value);
    control.markAsDirty();
    this.addressText.set(value);
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
    this.activeSuggestionIndex.set(-1);
  }

  /**
   * Captures the customer's current coordinates so the owner's pickup map has a
   * real destination instead of only free-text directions.
   */
  async markMyLocation(): Promise<void> {
    if (this.locatingDevice()) return;

    this.locatingDevice.set(true);
    this.locationError.set('');
    this.locationMessage.set('');

    try {
      const position = await this.deviceLocation.getCurrentPosition();
      const resolved = await this.resolveAddress(position.latitude, position.longitude);
      const addressText = resolved?.formattedAddress ?? this.addressText().trim();

      if (resolved?.formattedAddress) {
        this.setAddress(resolved.formattedAddress);
      }

      this.pickupPin.set({
        accuracyMeters: position.accuracyMeters,
        autoResolved: false,
        barangay: resolved?.barangay ?? null,
        capturedAddress: addressText,
        cityOrMunicipality: resolved?.cityOrMunicipality ?? null,
        latitude: position.latitude,
        longitude: position.longitude,
        placeId: resolved?.placeId ?? null,
        source: 'currentLocation',
      });
      this.closeSuggestions();
      this.locationMessage.set(
        resolved?.formattedAddress
          ? 'Your current location is pinned for the rider.'
          : 'Your coordinates are pinned. Please still type your street and barangay.',
      );
    } catch (error) {
      this.locationError.set(
        error instanceof Error
          ? error.message
          : 'Your location could not be captured. Type your address instead.',
      );
    } finally {
      this.locatingDevice.set(false);
    }
  }

  clearPin(): void {
    this.pickupPin.set(null);
    this.locationMessage.set('');
    this.locationError.set('');
  }

  pinSummary(): string {
    const pin = this.pickupPin();
    if (!pin) return '';
    const coordinates = `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`;
    return pin.accuracyMeters
      ? `${coordinates} (±${pin.accuracyMeters} m)`
      : coordinates;
  }

  async submitBooking(): Promise<void> {
    if (this.submitting()) return;

    this.bookingForm.markAllAsTouched();
    if (this.bookingForm.invalid) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.field-control.ng-invalid')?.focus(),
      );
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);
    this.closeSuggestions();
    const value = this.bookingForm.getRawValue();
    const isPickup = value.orderMethod === 'pickupDelivery';

    // Most customers type an address and submit without ever opening the
    // suggestion list, which previously meant the owner received no map pin at
    // all. Resolve the typed text once, as a best effort, and send it as an
    // unconfirmed pin. A lookup failure must never block the booking.
    if (isPickup && !this.pickupPin() && value.address.trim().length >= 3) {
      const resolved = await this.resolveFirstSuggestion(value.address.trim());
      if (resolved) {
        this.pickupPin.set({
          accuracyMeters: null,
          autoResolved: true,
          barangay: resolved.barangay,
          capturedAddress: value.address.trim(),
          cityOrMunicipality: resolved.cityOrMunicipality,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          placeId: resolved.placeId,
          source: 'addressSearch',
        });
      }
    }

    this.api
      .createBooking({
        additionalNotes: value.notes.trim() || null,
        address: isPickup ? value.address.trim() : 'In-store',
        emailAddress: value.email.trim() || null,
        fulfillmentType: isPickup ? 'PickupAndDelivery' : 'DropOff',
        fullName: value.fullName.trim(),
        loadCount: Number(value.loadCount),
        mobileNumber: value.mobileNumber.replace(/\s+/g, ''),
        paymentMethod: value.paymentMethod === 'qr' ? 'QrCodeOnlinePayment' : 'CashOnDelivery',
        pickupLocation: isPickup ? this.toPickupLocationPayload() : null,
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

  private toPickupLocationPayload(): PickupLocationPayload | null {
    const pin = this.pickupPin();
    if (!pin) return null;

    const landmark = this.bookingForm.controls.landmark.value.trim();
    // An auto-resolved pin is an approximation from typed text, so it is never
    // reported as confirmed even though the address still matches.
    const confirmed = !pin.autoResolved && !this.pinNeedsRecheck();

    return {
      barangay: pin.barangay,
      cityOrMunicipality: pin.cityOrMunicipality,
      confirmedAt: confirmed ? new Date().toISOString() : null,
      formattedAddress:
        this.bookingForm.controls.address.value.trim() || pin.capturedAddress,
      landmark: landmark || null,
      latitude: pin.latitude,
      locationConfirmed: confirmed,
      locationSource: pin.source,
      longitude: pin.longitude,
      pickupInstructions: null,
      placeId: pin.placeId,
      plusCode: null,
    };
  }

  /** Best-effort single lookup. Resolves to null on any failure. */
  private resolveFirstSuggestion(query: string) {
    return new Promise<AddressSuggestion | null>((resolve) => {
      this.addressLookup
        .search(query)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (results) => resolve(results[0] ?? null),
          error: () => resolve(null),
        });
    });
  }

  private resolveAddress(latitude: number, longitude: number) {
    return new Promise<AddressSuggestion | null>((resolve) => {
      this.addressLookup
        .reverse(latitude, longitude)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) => resolve(result),
          error: () => resolve(null),
        });
    });
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

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
