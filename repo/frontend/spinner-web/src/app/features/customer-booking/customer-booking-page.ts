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
import {
  DeviceLocationService,
  GeolocationUnavailableError,
} from '../../core/device-location.service';
import {
  type BookingConfirmationDto,
  type LaundryServiceDto,
  type PickupLocationPayload,
  SpinnerApiService,
} from '../../core/spinner-api.service';
import { LocationPickerMap, type MapPoint } from './location-picker-map';

type OrderMethod = 'pickupDelivery' | 'dropOff';
type PaymentMethod = 'cod' | 'qr';

/** How the coordinates were obtained. Mirrors the API's LocationSource. */
type PinSource = 'currentLocation' | 'addressSearch' | 'manualPin';

/**
 * Mutually exclusive. Only one may be rendered, which prevents the previous
 * "Pickup pin saved" and "Finding your location took too long" appearing
 * together.
 */
type LocationStatus = 'idle' | 'locating' | 'ready' | 'failed';

interface ChoiceOption<T extends string> {
  caption: string;
  title: string;
  value: T;
}

interface PickupPin {
  accuracyMeters: number | null;
  /** Nearby address reported by the geocoder. Never shown as the customer's own. */
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
  source: PinSource;
}

const SUGGESTION_DEBOUNCE_MS = 320;

/** Laundromat service area centre, used as the map's starting view. */
const SERVICE_AREA_CENTRE: MapPoint = { latitude: 9.2381784, longitude: 125.9624521 };

@Component({
  selector: 'app-customer-booking-page',
  imports: [ReactiveFormsModule, LocationPickerMap],
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

  readonly locationStatus = signal<LocationStatus>('idle');
  readonly locationError = signal('');
  readonly pickupPin = signal<PickupPin | null>(null);
  readonly mapVisible = signal(false);

  readonly geolocationSupported = this.deviceLocation.isSupported;
  readonly inAppBrowser = this.deviceLocation.isInAppBrowser;

  readonly mapCentre = computed<MapPoint>(() => {
    const pin = this.pickupPin();
    return pin ? { latitude: pin.latitude, longitude: pin.longitude } : SERVICE_AREA_CENTRE;
  });

  readonly pinCoordinates = computed(() => {
    const pin = this.pickupPin();
    if (!pin) return '';
    return `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`;
  });

  readonly pinSourceLabel = computed(() => {
    const pin = this.pickupPin();
    if (!pin) return '';
    if (pin.source === 'currentLocation') {
      return pin.accuracyMeters
        ? `From your current location (±${pin.accuracyMeters} m)`
        : 'From your current location';
    }
    return pin.source === 'manualPin' ? 'Chosen on the map' : 'From the selected place';
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
    const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';

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
      this.activeSuggestionIndex.set((this.activeSuggestionIndex() + step + total) % total);
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

  /**
   * Moves the pin to a searched place. The customer's own address text is left
   * untouched on purpose: a geocoder hit is a nearby reference such as the
   * barangay school, not where the customer actually lives.
   */
  applySuggestion(suggestion: AddressSuggestion): void {
    this.setPin({
      accuracyMeters: null,
      formattedAddress: suggestion.formattedAddress,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: suggestion.placeId,
      source: 'addressSearch',
    });
    this.closeSuggestions();
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
    this.activeSuggestionIndex.set(-1);
  }

  showMap(): void {
    this.mapVisible.set(true);
    if (!this.pickupPin()) {
      // Seed the pin at the service-area centre so dragging has a starting point.
      this.setPin({
        accuracyMeters: null,
        formattedAddress: null,
        latitude: SERVICE_AREA_CENTRE.latitude,
        longitude: SERVICE_AREA_CENTRE.longitude,
        placeId: null,
        source: 'manualPin',
      });
    }
  }

  /** The customer dragged the map; the centre is now the pickup point. */
  onMapPointChosen(point: MapPoint): void {
    const previous = this.pickupPin();
    if (
      previous &&
      Math.abs(previous.latitude - point.latitude) < 0.000005 &&
      Math.abs(previous.longitude - point.longitude) < 0.000005
    ) {
      return;
    }

    this.setPin({
      accuracyMeters: null,
      formattedAddress: null,
      latitude: point.latitude,
      longitude: point.longitude,
      placeId: null,
      source: 'manualPin',
    });

    // Label the point for reference only; never overwrite what the customer typed.
    this.addressLookup
      .reverse(point.latitude, point.longitude)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nearby) => {
        if (!nearby) return;
        const current = this.pickupPin();
        if (!current || current.source !== 'manualPin') return;
        this.pickupPin.set({ ...current, formattedAddress: nearby.formattedAddress });
      });
  }

  async useCurrentLocation(): Promise<void> {
    if (this.locationStatus() === 'locating') return;

    this.locationStatus.set('locating');
    this.locationError.set('');

    try {
      const position = await this.deviceLocation.getCurrentPosition((refined) => {
        const current = this.pickupPin();
        // Only upgrade if the customer has not moved the pin since.
        if (!current || current.source !== 'currentLocation') return;
        this.pickupPin.set({
          ...current,
          accuracyMeters: refined.accuracyMeters,
          latitude: refined.latitude,
          longitude: refined.longitude,
        });
      });

      this.setPin({
        accuracyMeters: position.accuracyMeters,
        formattedAddress: null,
        latitude: position.latitude,
        longitude: position.longitude,
        placeId: null,
        source: 'currentLocation',
      });
      this.mapVisible.set(true);
      this.closeSuggestions();

      this.addressLookup
        .reverse(position.latitude, position.longitude)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((nearby) => {
          if (!nearby) return;
          const current = this.pickupPin();
          if (!current || current.source !== 'currentLocation') return;
          this.pickupPin.set({ ...current, formattedAddress: nearby.formattedAddress });
        });
    } catch (error) {
      // Failing here must not erase a pin the customer already has.
      this.locationStatus.set(this.pickupPin() ? 'ready' : 'failed');
      this.locationError.set(
        error instanceof GeolocationUnavailableError
          ? error.message
          : 'Your location could not be captured. Move the map pin to your pickup point instead.',
      );
      this.mapVisible.set(true);
    }
  }

  changeLocation(): void {
    this.pickupPin.set(null);
    this.locationStatus.set('idle');
    this.locationError.set('');
    this.mapVisible.set(true);
  }

  submitBooking(): void {
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

  private setPin(pin: PickupPin): void {
    this.pickupPin.set(pin);
    this.locationStatus.set('ready');
    this.locationError.set('');
  }

  private toPickupLocationPayload(): PickupLocationPayload | null {
    const pin = this.pickupPin();
    if (!pin) return null;

    const landmark = this.bookingForm.controls.landmark.value.trim();

    return {
      barangay: null,
      cityOrMunicipality: null,
      // Any pin the customer placed or accepted is a deliberate choice.
      confirmedAt: new Date().toISOString(),
      formattedAddress:
        pin.formattedAddress ?? this.bookingForm.controls.address.value.trim(),
      landmark: landmark || null,
      latitude: pin.latitude,
      locationConfirmed: true,
      locationSource: pin.source,
      longitude: pin.longitude,
      pickupInstructions: null,
      placeId: pin.placeId,
      plusCode: null,
    };
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
