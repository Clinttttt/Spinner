import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { interval, switchMap, takeWhile } from 'rxjs';

import { type BookingCheckoutStatusDto, SpinnerApiService } from '../../core/spinner-api.service';

/** How often the page re-asks while a payment is still settling. */
const POLL_INTERVAL_MS = 2000;

/** How long to keep asking before telling the customer to check back. */
const MAX_POLL_ATTEMPTS = 20;

/**
 * Where PayMongo returns the customer after a QR payment.
 *
 * The redirect itself proves nothing: anyone can open this URL. So the page asks
 * the API what actually happened and shows that, rather than congratulating a
 * customer whose payment failed. While the confirmation is still in flight it says
 * so and keeps checking, because the provider's webhook can land a second or two
 * after the customer does.
 */
@Component({
  selector: 'app-payment-complete-page',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './payment-complete-page.html',
  styleUrl: './payment-complete-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentCompletePage {
  private readonly api = inject(SpinnerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly status = signal<BookingCheckoutStatusDto | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly stillWaiting = signal(false);

  readonly reference = signal('');

  readonly isPickup = computed(() => this.status()?.fulfillmentType === 'PickupAndDelivery');

  readonly total = computed(() => {
    const current = this.status();
    if (!current) return 0;
    return current.serviceAmount > 0 ? current.serviceAmount + current.deliveryFee : current.amount;
  });

  /**
   * Turns a price unit into a countable noun.
   *
   * Services are priced "per load", which renders as "2 per load" if the label is
   * dropped straight after the quantity.
   */
  countLabel(quantity: number, unitLabel: string | null): string {
    const noun = (unitLabel || 'load').replace(/^per\s+/i, '').trim() || 'load';
    return `${quantity} ${noun}${quantity === 1 ? '' : 's'}`;
  }

  /** A readable date, or the raw value if it is not a date we recognise. */ readonly scheduleDate =
    computed(() => {
      const raw = this.status()?.preferredDate;
      if (!raw) return null;

      const parsed = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return raw;

      return parsed.toLocaleDateString('en-PH', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        year: 'numeric',
      });
    });

  constructor() {
    const reference = this.route.snapshot.queryParamMap.get('ref')?.trim() ?? '';
    this.reference.set(reference);

    if (!reference) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.load(reference);
  }

  private load(reference: string): void {
    let attempts = 0;

    this.api
      .getCheckoutStatus(reference)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.status.set(status);
          this.loading.set(false);
          if (status.state === 'confirming') this.poll(reference, () => (attempts += 1));
        },
        error: () => {
          this.loading.set(false);
          this.notFound.set(true);
        },
      });
  }

  /**
   * Keeps asking while the payment settles.
   *
   * Bounded on purpose: an unbounded poll would spin for ever on a genuinely stuck
   * payment and tell the customer nothing. After the cap the page says the payment
   * is recorded and being confirmed, which is true and actionable.
   */
  private poll(reference: string, count: () => number): void {
    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.api.getCheckoutStatus(reference)),
        takeWhile((status) => status.state === 'confirming' && count() < MAX_POLL_ATTEMPTS, true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (status) => {
          this.status.set(status);
          if (status.state === 'confirming' && count() >= MAX_POLL_ATTEMPTS) {
            this.stillWaiting.set(true);
          }
        },
        error: () => this.stillWaiting.set(true),
      });
  }
}
