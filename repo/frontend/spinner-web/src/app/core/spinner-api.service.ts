import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface LaundryServiceDto {
  id: string;
  name: string;
  description: string | null;
  unitLabel: string;
  basePrice: number;
  supportsPickupAndDelivery: boolean;
  deliveryFee: number | null;
}

export interface BookingConfirmationDto {
  orderId: string;
  orderCode: string;
  trackingCode: string;
  customerName: string;
  status: string;
  estimatedTotalAmount: number;
}

export interface CreateBookingPayload {
  fullName: string;
  mobileNumber: string;
  emailAddress: string | null;
  serviceId: string;
  fulfillmentType: 'PickupAndDelivery' | 'DropOff';
  address: string;
  preferredDate: string;
  preferredTimeWindow: string;
  paymentMethod: 'CashOnDelivery' | 'QrCodeOnlinePayment';
  loadCount: number;
  additionalNotes: string | null;
}

@Injectable({ providedIn: 'root' })
export class SpinnerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl =
    (window as Window & { __SPINNER_API_URL__?: string }).__SPINNER_API_URL__ ??
    'http://localhost:5235';

  getServices() {
    return this.http.get<LaundryServiceDto[]>(
      `${this.baseUrl}/api/services-pricing/services?activeOnly=true`,
    );
  }

  createBooking(payload: CreateBookingPayload) {
    return this.http.post<BookingConfirmationDto>(`${this.baseUrl}/api/bookings`, payload);
  }

  getBookingConfirmation(orderCode: string) {
    return this.http.get<BookingConfirmationDto>(
      `${this.baseUrl}/api/bookings/${encodeURIComponent(orderCode)}/confirmation`,
    );
  }
}
