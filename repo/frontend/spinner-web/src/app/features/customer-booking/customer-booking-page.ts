import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';

import {
  type AddressSuggestion,
  AddressLookupService,
  type GeoBias,
} from '../../core/address-lookup.service';
import {
  DeviceLocationService,
  GeolocationUnavailableError,
} from '../../core/device-location.service';
import {
  type SavedBookingDetails,
  SavedBookingDetailsService,
} from '../../core/saved-booking-details.service';
import {
  type BookingConfirmationDto,
  type CreateBookingPayload,
  type LaundryServiceDto,
  type PickupLocationPayload,
  type ServiceAreaCheckDto,
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

interface ServiceLine {
  amount: number;
  id: string;
  loads: number;
  name: string;
  unitLabel: string;
  unitPrice: number;
}

/** Everything the confirmation modal needs, frozen at submit time. */
interface SubmittedSummary {
  address: string;
  customerName: string;
  deliveryFee: number;
  email: string | null;
  landmark: string | null;
  mobileNumber: string;
  notes: string | null;
  orderMethodLabel: string;
  paymentLabel: string;
  pinCoordinates: string | null;
  preferredDate: string;
  preferredTime: string;
  serviceAmount: number;
  serviceLines: ServiceLine[];
  total: number;
}

const SUGGESTION_DEBOUNCE_MS = 320;
const SERVICE_AREA_DEBOUNCE_MS = 400;

/** Upper bound per service line. Bulk jobs are arranged with the shop directly. */
const MAX_SERVICE_LOADS = 20;

/** Laundromat service area centre, used as the map's starting view. */
const SERVICE_AREA_CENTRE: MapPoint = { latitude: 9.2381784, longitude: 125.9624521 };

@Component({
  selector: 'app-customer-booking-page',
  imports: [DecimalPipe, ReactiveFormsModule, LocationPickerMap],
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
  private readonly savedDetails = inject(SavedBookingDetailsService);
  private readonly addressQuery = new Subject<string>();
  private readonly serviceAreaQuery = new Subject<PickupPin>();

  /**
   * True when this visit's form was filled in from a previous booking.
   *
   * Shown to the customer rather than done silently: they need to know why their details
   * are already there, and they need a way out of it on a shared phone.
   */
  readonly detailsRestored = signal(false);

  readonly bookingComplete = signal(false);
  readonly trackingNoticeVisible = signal(false);
  /** The order lookup dialog, replacing a native browser prompt. */
  readonly trackingLookupOpen = signal(false);
  readonly trackingCodeInput = signal('');
  readonly trackingLooking = signal(false);
  readonly trackingError = signal('');
  readonly services = signal<readonly LaundryServiceDto[]>([]);
  readonly loadingServices = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly confirmation = signal<BookingConfirmationDto | null>(null);
  /** Full snapshot of what was submitted, shown in the confirmation modal. */
  readonly submittedSummary = signal<SubmittedSummary | null>(null);
  readonly minimumDate = this.toDateInputValue(new Date());

  readonly suggestions = signal<readonly AddressSuggestion[]>([]);
  readonly suggestionsOpen = signal(false);
  readonly searchingAddress = signal(false);
  readonly activeSuggestionIndex = signal(-1);

  readonly locationStatus = signal<LocationStatus>('idle');
  readonly locationError = signal('');
  /** True when the failure can only be resolved outside this browser. */
  readonly offerExternalBrowser = signal(false);
  readonly pickupPin = signal<PickupPin | null>(null);
  /**
   * The map is hidden until the customer asks for it.
   *
   * It used to render immediately, and on a phone a page scroll that started over
   * the map panned the map instead of scrolling the page. Leaflet reported that
   * as a real gesture, so the form saved a pin at roughly the default centre and
   * labelled it with whatever place happened to be nearest. Customers ended up
   * with an order pointing at a barangay school they had never selected.
   */
  readonly mapVisible = signal(false);

  readonly serviceArea = signal<ServiceAreaCheckDto | null>(null);
  readonly checkingServiceArea = signal(false);

  /** True only when the API has positively judged the pin out of range. */
  readonly outsideServiceArea = computed(() => this.serviceArea()?.status === 'outside');

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
    orderMethod: this.formBuilder.nonNullable.control<OrderMethod>('pickupDelivery'),
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^(09|\+639)\d{9}$/)]],
    email: ['', Validators.email],
    preferredDate: ['', Validators.required],
    preferredTime: ['', Validators.required],
    notes: [''],
    paymentMethod: this.formBuilder.nonNullable.control<PaymentMethod>('cod'),
    address: ['', Validators.required],
    landmark: [''],
  });

  /**
   * Chosen service ids. A set rather than a single control because a customer can
   * book, say, Wash Dry Fold and Dry Only in one visit.
   */
  readonly selectedServiceIds = signal<readonly string[]>([]);

  /**
   * Loads per chosen service, keyed by service id.
   *
   * Kept separate from the selection so that unticking a service and ticking it
   * again does not silently resurrect an old quantity, and so that two services
   * in one booking can carry genuinely different amounts of laundry.
   */
  private readonly serviceLoads = signal<Readonly<Record<string, number>>>({});

  /** Bias for address search, taken from the configured pickup area. */
  private readonly searchBias = signal<GeoBias>({
    latitude: 9.2381784,
    longitude: 125.9624521,
    radiusKm: 25,
  });

  readonly selectedServices = computed(() =>
    this.services().filter((service) => this.selectedServiceIds().includes(service.id)),
  );

  readonly loadCount = computed(() =>
    this.serviceLines().reduce((total, line) => total + line.loads, 0),
  );

  readonly serviceLines = computed(() => {
    const loads = this.serviceLoads();

    return this.selectedServices().map((service) => {
      const quantity = loads[service.id] ?? 1;

      return {
        amount: service.basePrice * quantity,
        id: service.id,
        loads: quantity,
        name: service.name,
        unitLabel: service.unitLabel,
        unitPrice: service.basePrice,
      };
    });
  });

  constructor() {
    this.loadServices();
    this.loadSearchBias();
    this.watchServiceArea();
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
        switchMap((query) => this.addressLookup.search(query, this.searchBias())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.searchingAddress.set(false);
        this.suggestions.set(results);
        this.activeSuggestionIndex.set(-1);
        this.suggestionsOpen.set(results.length > 0);
      });

    // Last, so patching orderMethod runs through the subscription above and the address
    // validator ends up matching the restored choice.
    this.restoreSavedDetails();
  }

  /**
   * Fills the form from the customer's previous booking on this browser.
   *
   * A pin is put back through setPin rather than assigned, so it is re-checked against
   * the shop's service area as it stands today. The area is configurable, and a pin that
   * was inside it last month is not guaranteed to be inside it now.
   */
  private restoreSavedDetails(): void {
    const saved = this.savedDetails.read();
    if (!saved) return;

    this.bookingForm.patchValue({
      address: saved.address,
      email: saved.email,
      fullName: saved.fullName,
      landmark: saved.landmark,
      mobileNumber: saved.mobileNumber,
      orderMethod: saved.orderMethod,
      paymentMethod: saved.paymentMethod,
      preferredTime: saved.preferredTime,
    });

    if (saved.orderMethod === 'pickupDelivery' && saved.pickupPin) {
      this.setPin(saved.pickupPin);
      this.mapVisible.set(true);
    }

    this.detailsRestored.set(true);
  }

  /**
   * Empties the remembered details and the fields they filled.
   *
   * Present because a phone can be shared. Someone booking for the first time on a
   * relative's handset must be able to get a blank form without editing five fields, and
   * without their laundry going to the previous person's address.
   */
  forgetSavedDetails(): void {
    this.savedDetails.clear();
    this.detailsRestored.set(false);

    this.bookingForm.patchValue({
      address: '',
      email: '',
      fullName: '',
      landmark: '',
      mobileNumber: '',
    });

    this.bookingForm.controls.fullName.markAsUntouched();
    this.bookingForm.controls.mobileNumber.markAsUntouched();
    this.bookingForm.controls.address.markAsUntouched();

    this.clearPin();
    this.mapVisible.set(false);
    this.closeSuggestions();
  }

  get serviceAmount(): number {
    return this.serviceLines().reduce((total, line) => total + line.amount, 0);
  }

  get deliveryFee(): number {
    if (this.bookingForm.controls.orderMethod.value !== 'pickupDelivery') return 0;
    // One trip, so the fee is charged once at the highest configured rate.
    return this.selectedServices().reduce(
      (highest, service) => Math.max(highest, service.deliveryFee ?? 0),
      0,
    );
  }

  get estimatedTotal(): number {
    return this.serviceAmount + this.deliveryFee;
  }

  isServiceSelected(serviceId: string): boolean {
    return this.selectedServiceIds().includes(serviceId);
  }

  toggleService(serviceId: string): void {
    const wasSelected = this.selectedServiceIds().includes(serviceId);

    this.selectedServiceIds.update((current) =>
      wasSelected ? current.filter((id) => id !== serviceId) : [...current, serviceId],
    );

    this.serviceLoads.update((current) => {
      const next = { ...current };
      if (wasSelected) delete next[serviceId];
      else next[serviceId] = 1;
      return next;
    });
  }

  /** Loads chosen for one service. Defaults to a single load. */
  serviceLoadCount(serviceId: string): number {
    return this.serviceLoads()[serviceId] ?? 1;
  }

  /**
   * Nudge one service's load count. Bounded because a customer-facing form should
   * not be able to submit zero loads or an implausible bulk order by holding the
   * button down; larger jobs are handled by the shop directly.
   */
  adjustServiceLoads(serviceId: string, delta: number): void {
    if (!this.selectedServiceIds().includes(serviceId)) return;

    this.serviceLoads.update((current) => {
      const next = Math.min(MAX_SERVICE_LOADS, Math.max(1, (current[serviceId] ?? 1) + delta));
      return { ...current, [serviceId]: next };
    });
  }

  canDecreaseLoads(serviceId: string): boolean {
    return this.serviceLoadCount(serviceId) > 1;
  }

  canIncreaseLoads(serviceId: string): boolean {
    return this.serviceLoadCount(serviceId) < MAX_SERVICE_LOADS;
  }

  selectOrderMethod(value: OrderMethod): void {
    this.bookingForm.controls.orderMethod.setValue(value);
  }

  selectPayment(value: PaymentMethod): void {
    this.bookingForm.controls.paymentMethod.setValue(value);
  }

  hasError(
    controlName:
      'address' | 'email' | 'fullName' | 'mobileNumber' | 'preferredDate' | 'preferredTime',
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
    // Choosing a place is deliberate, so show the pin that was just set rather
    // than attaching a coordinate the customer cannot see.
    this.mapVisible.set(true);
    this.closeSuggestions();
  }

  closeSuggestions(): void {
    this.suggestionsOpen.set(false);
    this.activeSuggestionIndex.set(-1);
  }

  /**
   * Closes the list when the customer taps anywhere outside it.
   *
   * Bound on the document because the list sits between the address field and the
   * next section: leaving it open covered the rest of the form, and tapping past it
   * is the reflex people already have.
   */
  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerDown(event: Event): void {
    if (!this.suggestionsOpen()) return;

    const target = event.target as HTMLElement | null;
    // A tap inside the address block is either editing or choosing, so leave it.
    if (target?.closest('.address-field')) return;

    this.closeSuggestions();
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
          : 'Your location could not be captured. Point out your pickup point on the map instead.',
      );
      // Only offered when opening a real browser is genuinely the fix, so it does
      // not appear for someone who simply denied the prompt in Chrome.
      this.offerExternalBrowser.set(
        error instanceof GeolocationUnavailableError && error.suggestExternalBrowser,
      );
      this.mapVisible.set(true);
    }
  }

  /**
   * Hands the page to the device browser.
   *
   * The in-app browser only receives a position when the host app itself holds the
   * OS location permission, and a web page can neither request nor read that. So
   * the only real fix is to leave, and on Android an intent URL is the one link
   * that reliably does it.
   */
  openInDeviceBrowser(): void {
    const link = this.deviceLocation.externalBrowserLink();
    if (!link.href) return;

    if (link.isIntent) {
      window.location.href = link.href;
      return;
    }

    window.open(link.href, '_blank', 'noopener');
  }

  /**
   * How trustworthy the captured point is, in plain words.
   *
   * A network fix can be hundreds of metres out, which lands the pin on a
   * neighbour's house. Saying so is what prompts the customer to nudge it rather
   * than assume the pin is exact.
   */
  readonly pinAccuracyLabel = computed(() => {
    const accuracy = this.pickupPin()?.accuracyMeters;
    if (accuracy === null || accuracy === undefined) return null;

    if (accuracy <= 25) return `Accurate to about ${accuracy} m`;
    if (accuracy <= 150) {
      return `Accurate to about ${accuracy} m — check the pin is on your house`;
    }

    return `Only accurate to about ${Math.round(accuracy / 10) * 10} m, so please move the pin onto your house`;
  });

  /** The customer asked for the map, so a pan from here on is deliberate. */
  openMap(): void {
    this.mapVisible.set(true);
    this.closeSuggestions();
  }

  /**
   * Puts the form back to address-only. The pin is dropped as well, because
   * leaving a hidden coordinate attached to the order is exactly how a customer
   * ends up with a pickup point they cannot see or correct.
   */
  closeMap(): void {
    this.mapVisible.set(false);
    if (this.pickupPin()?.source === 'manualPin') this.clearPin();
  }

  private clearPin(): void {
    this.pickupPin.set(null);
    this.locationStatus.set('idle');
    this.locationError.set('');
    this.serviceArea.set(null);
    this.checkingServiceArea.set(false);
  }

  /**
   * Hands the customer to the payment provider.
   *
   * Deliberately no order is created here. If the customer never pays, nothing is
   * left behind for the shop to chase, and if they pay twice the API resolves both
   * attempts to the one booking.
   */
  private startQrCheckout(payload: CreateBookingPayload): void {
    this.api
      .startCheckout(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (checkout) => {
          // Leaving the site, so the submitting state stays on until we go.
          window.location.assign(checkout.checkoutUrl);
        },
        error: (error: { error?: { detail?: string; title?: string } }) => {
          this.submitting.set(false);
          this.errorMessage.set(
            error.error?.detail ??
              error.error?.title ??
              'We could not open the payment page. Please try again, or choose Cash on Delivery.',
          );
        },
      });
  }

  changeLocation(): void {
    this.clearPin();
    this.mapVisible.set(true);
  }

  submitBooking(): void {
    if (this.submitting()) return;

    this.bookingForm.markAllAsTouched();

    if (this.selectedServiceIds().length === 0) {
      this.errorMessage.set('Choose at least one service.');
      return;
    }

    if (this.bookingForm.invalid) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('.field-control.ng-invalid')?.focus(),
      );
      return;
    }

    const isPickup = this.bookingForm.controls.orderMethod.value === 'pickupDelivery';

    // Refuse locally for a fast answer. The API enforces the same rule, so a
    // stale page cannot slip an out-of-area booking through.
    if (isPickup && this.outsideServiceArea()) {
      this.errorMessage.set(
        this.serviceArea()?.message ??
          'That pickup point is outside our service area. Move the pin closer or contact us.',
      );
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);
    this.closeSuggestions();
    const value = this.bookingForm.getRawValue();
    const selected = this.selectedServices();
    // Snapshot the lines so the request and the confirmation cannot disagree if a
    // stepper is nudged while the call is in flight.
    const lines = this.serviceLines();

    const payload = {
      additionalNotes: value.notes.trim() || null,
      address: isPickup ? value.address.trim() : 'In-store',
      emailAddress: value.email.trim() || null,
      fulfillmentType: isPickup ? ('PickupAndDelivery' as const) : ('DropOff' as const),
      fullName: value.fullName.trim(),
      loadCount: lines.reduce((total, line) => total + line.loads, 0),
      mobileNumber: value.mobileNumber.replace(/\s+/g, ''),
      paymentMethod:
        value.paymentMethod === 'qr'
          ? ('QrCodeOnlinePayment' as const)
          : ('CashOnDelivery' as const),
      pickupLocation: isPickup ? this.toPickupLocationPayload() : null,
      preferredDate: value.preferredDate,
      preferredTimeWindow: value.preferredTime,
      serviceId: selected[0].id,
      services: lines.map((line) => ({
        quantity: line.loads,
        serviceId: line.id,
      })),
    };

    // Remembered here rather than on a successful response, because the QR path leaves
    // this page for the payment provider and would otherwise never get the chance. The
    // form has already passed validation at this point, so what is stored is usable.
    this.rememberDetails(isPickup);

    // QR is paid before the booking exists, so this hands off to the payment page
    // rather than creating an order the shop could start working on unpaid.
    if (value.paymentMethod === 'qr') {
      this.startQrCheckout(payload);
      return;
    }

    this.api
      .createBooking(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (confirmation) => {
          this.submittedSummary.set({
            address: isPickup ? value.address.trim() : 'Drop-off at the shop',
            customerName: value.fullName.trim(),
            deliveryFee: this.deliveryFee,
            email: value.email.trim() || null,
            landmark: isPickup ? value.landmark.trim() || null : null,
            mobileNumber: value.mobileNumber.replace(/\s+/g, ''),
            notes: value.notes.trim() || null,
            orderMethodLabel: isPickup ? 'Pickup & Delivery' : 'Drop-off',
            paymentLabel: value.paymentMethod === 'qr' ? 'QR Online Payment' : 'Cash on Delivery',
            pinCoordinates: isPickup ? this.pinCoordinates() || null : null,
            preferredDate: value.preferredDate,
            preferredTime: value.preferredTime,
            serviceAmount: this.serviceAmount,
            serviceLines: lines,
            total: this.estimatedTotal,
          });
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

  /**
   * Opens the order lookup.
   *
   * Previously this called window.prompt, which renders the browser's own grey
   * dialog showing the site's hostname — it looks like a security warning rather
   * than part of the shop, and in some in-app browsers it is suppressed entirely,
   * so the button appeared to do nothing.
   */
  openTrackingLookup(): void {
    this.trackingCodeInput.set('');
    this.trackingError.set('');
    this.trackingLookupOpen.set(true);
  }

  closeTrackingLookup(): void {
    this.trackingLookupOpen.set(false);
    this.trackingLooking.set(false);
    this.trackingError.set('');
  }

  onTrackingCodeInput(event: Event): void {
    this.trackingCodeInput.set((event.target as HTMLInputElement).value);
    this.trackingError.set('');
  }

  lookUpOrder(): void {
    const code = this.trackingCodeInput().trim();

    if (!code) {
      this.trackingError.set('Enter the order code from your confirmation.');
      return;
    }

    this.trackingLooking.set(true);
    this.trackingError.set('');

    this.api
      .getBookingConfirmation(code)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.trackingLooking.set(false)),
      )
      .subscribe({
        next: (confirmation) => {
          this.confirmation.set(confirmation);
          this.trackingLookupOpen.set(false);
          this.trackingNoticeVisible.set(true);
        },
        error: () =>
          this.trackingError.set(
            'No order found with that code. Check the code on your confirmation and try again.',
          ),
      });
  }

  closeConfirmation(): void {
    this.bookingComplete.set(false);
    this.startFreshBooking();
  }

  /**
   * Returns the page to how it looked before anything was typed.
   *
   * The form is usually a shared phone at the counter, so leaving the previous
   * customer's name, number, and address on screen is both confusing and a privacy
   * problem. Scrolling back to the top matters as much as clearing the fields:
   * after the confirmation closes the viewport is near the bottom, which looks like
   * a half-filled form rather than a new one.
   */
  private startFreshBooking(): void {
    this.bookingForm.reset({
      address: '',
      email: '',
      fullName: '',
      landmark: '',
      mobileNumber: '',
      notes: '',
      orderMethod: 'pickupDelivery',
      paymentMethod: 'cod',
      preferredDate: '',
      preferredTime: '',
    });

    // reset() marks controls pristine but leaves them untouched, so the required
    // errors would otherwise show on a form nobody has filled in yet.
    this.bookingForm.markAsUntouched();

    this.clearPin();
    this.mapVisible.set(false);
    this.closeSuggestions();
    this.suggestions.set([]);
    this.offerExternalBrowser.set(false);
    this.errorMessage.set('');
    this.submittedSummary.set(null);

    // Back to the first service, matching a freshly loaded page.
    const services = this.services();
    if (services.length) {
      this.selectedServiceIds.set([services[0].id]);
      this.serviceLoads.set({ [services[0].id]: 1 });
    } else {
      this.selectedServiceIds.set([]);
      this.serviceLoads.set({});
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ behavior: 'smooth', top: 0 });
    }
  }

  /**
   * Stores what this booking used, for the next visit on this browser.
   *
   * A drop-off order keeps no address or pin: the customer is bringing the laundry in, so
   * "In-store" is not their address and remembering it would prefill nonsense next time.
   */
  private rememberDetails(isPickup: boolean): void {
    const value = this.bookingForm.getRawValue();
    const pin = this.pickupPin();

    const details: SavedBookingDetails = {
      address: isPickup ? value.address.trim() : '',
      email: value.email.trim(),
      fullName: value.fullName.trim(),
      landmark: isPickup ? value.landmark.trim() : '',
      mobileNumber: value.mobileNumber.replace(/\s+/g, ''),
      orderMethod: value.orderMethod,
      paymentMethod: value.paymentMethod,
      pickupPin:
        isPickup && pin
          ? {
              accuracyMeters: pin.accuracyMeters,
              formattedAddress: pin.formattedAddress,
              latitude: pin.latitude,
              longitude: pin.longitude,
              placeId: pin.placeId,
              source: pin.source,
            }
          : null,
      preferredTime: value.preferredTime,
    };

    this.savedDetails.save(details);
  }

  private setPin(pin: PickupPin): void {
    this.pickupPin.set(pin);
    this.locationStatus.set('ready');
    this.locationError.set('');
    this.checkingServiceArea.set(true);
    this.serviceAreaQuery.next(pin);
  }

  /**
   * Debounced because dragging the map emits a point on every gesture end.
   * A failed check leaves the area unknown rather than blocking the booking.
   */
  private watchServiceArea(): void {
    this.serviceAreaQuery
      .pipe(
        debounceTime(SERVICE_AREA_DEBOUNCE_MS),
        switchMap((pin) =>
          this.api.checkServiceArea(pin.latitude, pin.longitude).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.checkingServiceArea.set(false);
        this.serviceArea.set(result);
      });
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
      formattedAddress: pin.formattedAddress ?? this.bookingForm.controls.address.value.trim(),
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
          // Preselect the first service so the estimate is never empty, while
          // leaving every option toggleable.
          if (services.length && this.selectedServiceIds().length === 0) {
            this.selectedServiceIds.set([services[0].id]);
            this.serviceLoads.set({ [services[0].id]: 1 });
          }
        },
        error: () =>
          this.errorMessage.set(
            'Services are temporarily unavailable. Please try again in a moment.',
          ),
      });
  }

  /**
   * Reads the configured pickup area so address search is weighted towards it.
   * Without this bias the geocoder ranks same-named places in other provinces
   * above the barangay a few kilometres from the shop.
   */
  private loadSearchBias() {
    this.api
      .getBusinessSettings()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((settings) => {
        if (!settings?.pickupOriginLatitude || !settings.pickupOriginLongitude) return;
        this.searchBias.set({
          latitude: settings.pickupOriginLatitude,
          longitude: settings.pickupOriginLongitude,
          radiusKm: settings.pickupServiceRadiusKm || 25,
        });
      });
  }

  private toDateInputValue(date: Date): string {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 10);
  }
}
