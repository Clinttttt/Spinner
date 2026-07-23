import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TrackingApiService } from '../../core/api/tracking-api.service';
import { CustomerTrackingResponse, OrderStatus } from '../../shared/models/booking.models';

type TrackingStep = {
  status: OrderStatus;
  label: string;
};

@Component({
  selector: 'app-customer-tracking-page',
  imports: [RouterLink],
  templateUrl: './customer-tracking-page.html',
  styleUrl: './customer-tracking-page.scss'
})
export class CustomerTrackingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly trackingApi = inject(TrackingApiService);

  protected tracking: CustomerTrackingResponse | null = null;
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit() {
    const trackingCode = this.route.snapshot.paramMap.get('orderCode');
    if (!trackingCode) {
      this.errorMessage = 'Tracking details could not be found.';
      return;
    }

    this.isLoading = true;
    this.trackingApi
      .getTracking(trackingCode)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (tracking) => {
          this.tracking = tracking;
        },
        error: () => {
          this.errorMessage = 'We could not find this tracking code. Please check the link and try again.';
        }
      });
  }

  protected steps(): TrackingStep[] {
    const isDropOff = this.tracking?.fulfillmentType === 'DropOff';

    return [
      { status: 'BookingReceived', label: 'Booking Received' },
      { status: 'Confirmed', label: 'Confirmed' },
      { status: 'PickedUp', label: isDropOff ? 'Dropped Off' : 'Picked Up' },
      { status: 'BeingProcessed', label: 'Being Processed' },
      { status: 'ReadyForDelivery', label: isDropOff ? 'Ready for Claim' : 'Ready for Delivery' },
      { status: 'Completed', label: 'Completed' }
    ];
  }

  protected stepState(status: OrderStatus) {
    if (!this.tracking) return 'pending';

    const currentIndex = this.statusIndex(this.tracking.status);
    const stepIndex = this.statusIndex(status);

    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  }

  protected formatPeso(amount: number) {
    return `PHP ${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  protected formatPayment(value: string) {
    return value === 'QrCodeOnlinePayment' ? 'QR Code Online Payment' : 'Cash on Delivery';
  }

  protected formatFulfillment(value: string) {
    return value === 'PickupAndDelivery' ? 'Pickup & Delivery' : 'Drop-off';
  }

  private statusIndex(status: OrderStatus) {
    return ['BookingReceived', 'Confirmed', 'PickedUp', 'BeingProcessed', 'ReadyForDelivery', 'Completed'].indexOf(status);
  }
}
