import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import { ServiceResponse } from '../../shared/models/booking.models';

@Injectable({ providedIn: 'root' })
export class ServicesPricingApiService {
  private readonly api = inject(ApiClientService);

  getActiveServices() {
    return this.api.get<ServiceResponse[]>('/services-pricing/services', {
      query: { activeOnly: true },
    });
  }
}
