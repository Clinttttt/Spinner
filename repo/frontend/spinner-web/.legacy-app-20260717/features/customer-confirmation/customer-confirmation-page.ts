import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { BookingApiService } from '../../core/api/booking-api.service';
import { BookingConfirmationResponse } from '../../shared/models/booking.models';

@Component({
  selector: 'app-customer-confirmation-page',
  imports: [RouterLink],
  templateUrl: './customer-confirmation-page.html',
  styleUrl: './customer-confirmation-page.scss'
})
export class CustomerConfirmationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingApi = inject(BookingApiService);

  protected confirmation: BookingConfirmationResponse | null = null;
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit() {
    const stateConfirmation = history.state?.confirmation as BookingConfirmationResponse | undefined;
    if (stateConfirmation?.orderCode) {
      this.confirmation = stateConfirmation;
      return;
    }

    const orderCode = this.route.snapshot.paramMap.get('orderCode');
    if (!orderCode) {
      this.errorMessage = 'Booking details could not be found.';
      return;
    }

    this.isLoading = true;
    this.bookingApi
      .getBookingConfirmation(orderCode)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (confirmation) => {
          this.confirmation = confirmation;
        },
        error: () => {
          this.errorMessage = 'We could not load this booking confirmation. Please check the order code.';
        }
      });
  }

  protected formatPeso(amount: number) {
    return `PHP ${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  protected formatFulfillment(value: string) {
    return value === 'PickupAndDelivery' ? 'Pickup & Delivery' : 'Drop-off';
  }

  protected formatPayment(value: string) {
    return value === 'QrCodeOnlinePayment' ? 'QR Code Online Payment' : 'Cash on Delivery';
  }

  protected formatStatus(value: string) {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}
