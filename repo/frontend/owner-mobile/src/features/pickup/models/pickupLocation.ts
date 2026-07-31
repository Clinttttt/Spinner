import type { PaymentStatus, PickupService, PickupStatus } from "./pickup";

export type PickupLocationSource =
  | "currentLocation"
  | "addressSearch"
  | "manualPin"
  | "savedCustomerLocation"
  | "ownerFallback";

export type PickupLocationStatus =
  "confirmed" | "needsConfirmation" | "missingCoordinates" | "unavailable";

export interface PickupLocationSnapshot {
  barangay?: string;
  cityOrMunicipality?: string;
  confirmedAt?: string;
  formattedAddress: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  pickupInstructions?: string;
  placeId?: string;
  plusCode?: string;
  postalCode?: string;
  source: PickupLocationSource;
  status: PickupLocationStatus;
}

export interface PickupMapCoordinate {
  latitude: number;
  longitude: number;
}

export interface PickupRoutePreview {
  coordinates: PickupMapCoordinate[];
  origin: PickupMapCoordinate;
}

export interface PickupLocationDetails {
  /** The booking still needs owner approval before the rider can collect it. */
  awaitingConfirmation: boolean;
  customerName: string;
  customerPhone?: string;
  distanceMeters?: number;
  estimatedTravelMinutes?: number;
  location: PickupLocationSnapshot;
  orderCode: string;
  paymentMethod: PaymentStatus;
  pickupId: string;
  pickupStatus: PickupStatus;
  pickupTime: string;
  routePreview?: PickupRoutePreview;
  routePolyline?: string;
  services: PickupService[];
  shortAddress: string;
}
