import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class BusinessSettingsApiService {
  private readonly api = inject(ApiClientService);

  getBusinessSettings() {
    return this.api.get<unknown>('/business-settings');
  }
}
