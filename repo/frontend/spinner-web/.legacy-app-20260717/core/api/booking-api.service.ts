import { Injectable, inject } from '@angular/core';
import { ApiClientService } from './api-client.service';
import {
  BookingConfirmationResponse,
  CreateBookingRequest
} from '../../shared/models/booking.models';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly api = inject(ApiClientService);

  createBooking(request: CreateBookingRequest) {
    return this.api.post<BookingConfirmationResponse, CreateBookingRequest>('/bookings', request);
  }

  getBookingConfirmation(orderCode: string) {
    return this.api.get<BookingConfirmationResponse>(`/bookings/${orderCode}/confirmation`);
  }
}
