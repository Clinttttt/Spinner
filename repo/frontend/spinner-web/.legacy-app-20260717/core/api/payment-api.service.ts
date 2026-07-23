import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly api = inject(ApiClientService);

  getOnlinePaymentStatus(paymentCode: string) {
    return this.api.get<unknown>(`/payments/online/${paymentCode}/status`);
  }
}
