import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ReceiptResponse } from '../../shared/models/booking.models';

@Injectable({ providedIn: 'root' })
export class ReceiptApiService {
  private readonly api = inject(ApiClientService);

  getReceipt(receiptCode: string) {
    return this.api.get<ReceiptResponse>(`/receipts/${receiptCode}`);
  }
}
