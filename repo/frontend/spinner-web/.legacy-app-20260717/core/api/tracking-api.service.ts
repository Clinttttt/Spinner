import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { CustomerTrackingResponse } from '../../shared/models/booking.models';

@Injectable({ providedIn: 'root' })
export class TrackingApiService {
  private readonly api = inject(ApiClientService);

  getTracking(trackingCode: string) {
    return this.api.get<CustomerTrackingResponse>(`/orders/track/${trackingCode}`);
  }
}
