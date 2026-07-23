import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ReceiptApiService } from '../../core/api/receipt-api.service';
import { ReceiptResponse } from '../../shared/models/booking.models';

@Component({
  selector: 'app-customer-receipt-page',
  imports: [RouterLink],
  templateUrl: './customer-receipt-page.html',
  styleUrl: './customer-receipt-page.scss'
})
export class CustomerReceiptPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly receiptApi = inject(ReceiptApiService);

  protected receipt: ReceiptResponse | null = null;
  protected isLoading = false;
  protected errorMessage = '';

  ngOnInit() {
    const receiptCode = this.route.snapshot.paramMap.get('receiptCode');
    if (!receiptCode) {
      this.errorMessage = 'Receipt details could not be found.';
      return;
    }

    this.isLoading = true;
    this.receiptApi
      .getReceipt(receiptCode)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (receipt) => {
          this.receipt = receipt;
        },
        error: () => {
          this.errorMessage = 'We could not find this receipt. Please check the link and try again.';
        }
      });
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

  protected paidDate(value: string | null) {
    if (!value) return 'Pending payment';

    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(value));
  }
}
