import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly api = inject(ApiClientService);

  login(request: unknown) {
    return this.api.post<unknown>('/auth/login', request);
  }
}
