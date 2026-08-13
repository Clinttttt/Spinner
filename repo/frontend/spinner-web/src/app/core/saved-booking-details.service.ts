import { Injectable } from '@angular/core';

/**
 * The parts of a booking worth remembering between visits.
 *
 * Deliberately excludes the preferred date and the chosen services.
 *
 * The date is excluded because a remembered one is in the past by the next visit, and
 * prefilling an invalid date is worse than an empty field.
 *
 * The services are excluded on purpose, not for convenience: a pre-ticked service is a
 * charge the customer did not choose on this visit, and unlike a wrong name it is not
 * obvious on the page. Ticking a box is also the cheap part; typing an address is not.
 */
export interface SavedBookingDetails {
  address: string;
  email: string;
  fullName: string;
  landmark: string;
  mobileNumber: string;
  /** Mirrors the booking form's own union. Kept here so this service can validate it. */
  orderMethod: 'pickupDelivery' | 'dropOff';
  paymentMethod: 'cod' | 'qr';
  pickupPin: SavedPickupPin | null;
  preferredTime: string;
}

export interface SavedPickupPin {
  accuracyMeters: number | null;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  placeId: string | null;
  source: 'currentLocation' | 'addressSearch' | 'manualPin';
}

interface StoredEnvelope extends SavedBookingDetails {
  savedAt: string;
}

/** Versioned so a future change of shape cannot be read as the current one. */
const STORAGE_KEY = 'spinner.customer.last-booking.v1';

/**
 * How long remembered details stay usable.
 *
 * Not a privacy measure but a correctness one: this carries a physical pickup address
 * and a map pin, and quietly reusing a year-old address is how laundry gets collected
 * from somewhere the customer has moved out of. Six months is long enough to help a
 * regular customer and short enough that a stale address is retyped rather than assumed.
 */
const MAX_AGE_DAYS = 180;

/**
 * Remembers what a customer entered last time, in their own browser.
 *
 * Nothing is sent anywhere: this is localStorage on the customer's device, in the same
 * spirit as the browser's own form autofill. It exists because the shop takes repeat
 * bookings from the same handful of customers, and making each of them retype their
 * name, number and address every time is the sort of friction that loses a booking.
 *
 * Every read is validated field by field. localStorage is editable by anyone with the
 * developer tools open, so its contents are treated as untrusted input rather than as
 * something this application wrote.
 */
@Injectable({ providedIn: 'root' })
export class SavedBookingDetailsService {
  /**
   * What was saved last time, or null.
   *
   * Returns null rather than throwing for anything unexpected: a customer who cannot be
   * prefilled should get an empty form, never an error page.
   *
   * Nothing here deletes the record. An earlier version cleared it whenever it could not be
   * used — corrupt JSON, or past the retention window — which meant one bad read threw away
   * details the customer would otherwise have got back, and made the feature look as though
   * it only worked once. Only an explicit "Start fresh" removes it now, and a new save
   * replaces it.
   */
  read(): SavedBookingDetails | null {
    const raw = this.readRaw();
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!parsed || typeof parsed !== 'object') return null;

    const envelope = parsed as Partial<StoredEnvelope>;

    if (this.isExpired(envelope.savedAt)) return null;

    const orderMethod = envelope.orderMethod;
    const paymentMethod = envelope.paymentMethod;

    const details: SavedBookingDetails = {
      address: this.text(envelope.address),
      email: this.text(envelope.email),
      fullName: this.text(envelope.fullName),
      landmark: this.text(envelope.landmark),
      mobileNumber: this.text(envelope.mobileNumber),
      orderMethod: orderMethod === 'dropOff' ? 'dropOff' : 'pickupDelivery',
      paymentMethod: paymentMethod === 'qr' ? 'qr' : 'cod',
      pickupPin: this.pin(envelope.pickupPin),
      preferredTime: this.text(envelope.preferredTime),
    };

    // Nothing worth prefilling. Reported as absent so the page does not tell the
    // customer their details were restored when the form is still blank.
    if (!details.fullName && !details.mobileNumber) return null;

    return details;
  }

  save(details: SavedBookingDetails): void {
    const envelope: StoredEnvelope = { ...details, savedAt: new Date().toISOString() };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      // Private browsing, a full quota, or storage disabled by policy. Remembering
      // details is a convenience, so failing to do so is not worth telling anyone about.
    }
  }

  /** Used by the "not your details?" control, which matters on a shared phone. */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // As above.
    }
  }

  private readRaw(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // Reading localStorage throws outright when the browser blocks storage.
      return null;
    }
  }

  private isExpired(savedAt: string | undefined): boolean {
    if (!savedAt) return true;

    const saved = Date.parse(savedAt);
    if (Number.isNaN(saved)) return true;

    const ageDays = (Date.now() - saved) / 86_400_000;

    // A negative age means the clock moved, not that the entry is fresh forever.
    return ageDays < 0 || ageDays > MAX_AGE_DAYS;
  }

  private text(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private pin(value: unknown): SavedPickupPin | null {
    if (!value || typeof value !== 'object') return null;

    const candidate = value as Partial<SavedPickupPin>;

    // Coordinates are the only part that cannot be guessed at. Without a usable pair
    // there is no pin, whatever else was stored alongside it.
    if (!Number.isFinite(candidate.latitude) || !Number.isFinite(candidate.longitude)) {
      return null;
    }

    const latitude = candidate.latitude as number;
    const longitude = candidate.longitude as number;

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

    const source = candidate.source;

    return {
      accuracyMeters: Number.isFinite(candidate.accuracyMeters)
        ? (candidate.accuracyMeters as number)
        : null,
      formattedAddress:
        typeof candidate.formattedAddress === 'string' ? candidate.formattedAddress : null,
      latitude,
      longitude,
      placeId: typeof candidate.placeId === 'string' ? candidate.placeId : null,
      // A restored pin was placed on a previous visit, so it is not "your current
      // location" now. Reported as a chosen point, which is what it is.
      source: source === 'addressSearch' ? 'addressSearch' : 'manualPin',
    };
  }
}
