import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

declare global {
  interface Window {
    __SPINNER_API_URL__?: string;
  }
}

function resolveApiBaseUrl(): string {
  const configuredUrl = window.__SPINNER_API_URL__?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, '');
  }

  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:5235'
    : '';
}

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

export interface PickupLocationPayload {
  barangay: string | null;
  cityOrMunicipality: string | null;
  confirmedAt: string | null;
  formattedAddress: string;
  landmark: string | null;
  latitude: number;
  locationConfirmed: boolean;
  /** currentLocation | addressSearch | manualPin */
  locationSource: string;
  longitude: number;
  pickupInstructions: string | null;
  placeId: string | null;
  plusCode: string | null;
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
  pickupLocation: PickupLocationPayload | null;
}

export interface ServiceAreaCheckDto {
  /** inside | outside | notConfigured */
  status: 'inside' | 'outside' | 'notConfigured';
  allowsBooking: boolean;
  distanceKm: number | null;
  maxRadiusKm: number | null;
  policy: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SpinnerApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveApiBaseUrl();

  getServices() {
    return this.http.get<LaundryServiceDto[]>(
      `${this.baseUrl}/api/services-pricing/services?activeOnly=true`,
    );
  }

  /**
   * Asks the API whether a coordinate is inside the pickup area. The rule lives
   * on the server so the radius can change without redeploying the web app.
   */
  checkServiceArea(latitude: number, longitude: number) {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    return this.http.get<ServiceAreaCheckDto>(
      `${this.baseUrl}/api/service-area/check?${params.toString()}`,
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
