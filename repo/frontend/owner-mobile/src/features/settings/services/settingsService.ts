import type Ionicons from "@expo/vector-icons/Ionicons";

import { apiRequest } from "../../../api/apiClient";
import type {
  OperatingDay,
  PickupWindowSetting,
  ServiceSetting,
} from "../models/settings";

export interface BusinessSettingsDto {
  id: string;
  businessName: string;
  logoUrl: string | null;
  phoneNumber: string;
  address: string;
  operatingHours: string;
  pickupTimeWindows: string;
  isCashOnDeliveryEnabled: boolean;
  isQrCodeOnlinePaymentEnabled: boolean;
  isSmsBookingReceivedEnabled: boolean;
  isSmsBookingConfirmedEnabled: boolean;
  isSmsPickedUpEnabled: boolean;
  isSmsReadyForDeliveryEnabled: boolean;
  isSmsCompletedEnabled: boolean;
  isEmailBookingConfirmedEnabled: boolean;
  isEmailReceiptEnabled: boolean;
  isEmailCompletedEnabled: boolean;
  updatedAt: string;
}

interface LaundryServiceDto {
  id: string;
  name: string;
  description: string | null;
  unitLabel: string;
  basePrice: number;
  supportsPickupAndDelivery: boolean;
  deliveryFee: number | null;
  isActive: boolean;
  updatedAt: string;
}

export interface NotificationSettingsInput {
  isSmsBookingReceivedEnabled: boolean;
  isSmsBookingConfirmedEnabled: boolean;
  isSmsPickedUpEnabled: boolean;
  isSmsReadyForDeliveryEnabled: boolean;
  isSmsCompletedEnabled: boolean;
  isEmailBookingConfirmedEnabled: boolean;
  isEmailReceiptEnabled: boolean;
  isEmailCompletedEnabled: boolean;
}

const serviceIcons: {
  match: RegExp;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { match: /self/i, icon: "refresh-circle-outline" },
  { match: /hand/i, icon: "hand-left-outline" },
  { match: /pickup|delivery/i, icon: "car-outline" },
  { match: /drop/i, icon: "water-outline" },
  { match: /wash|dry/i, icon: "shirt-outline" },
];

function parseJsonArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function serviceIcon(name: string): keyof typeof Ionicons.glyphMap {
  return (
    serviceIcons.find(({ match }) => match.test(name))?.icon ?? "shirt-outline"
  );
}

function toServiceSetting(dto: LaundryServiceDto): ServiceSetting {
  return {
    id: dto.id,
    icon: serviceIcon(dto.name),
    name: dto.name,
    description: dto.description ?? "Laundry service",
    pricingType: "fixed",
    price: `₱${dto.basePrice.toLocaleString("en-PH", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })}`,
    unit: dto.unitLabel,
    isActive: dto.isActive,
    basePrice: dto.basePrice,
    deliveryFee: dto.deliveryFee,
    supportsPickupAndDelivery: dto.supportsPickupAndDelivery,
  };
}

export interface LaundryServiceInput {
  name: string;
  description: string;
  unitLabel: string;
  basePrice: number;
  supportsPickupAndDelivery: boolean;
  deliveryFee: number | null;
}

export function getBusinessSettings() {
  return apiRequest<BusinessSettingsDto>("/api/business-settings", {
    authenticated: false,
  });
}

export function updateBusinessProfile(input: {
  businessName: string;
  logoUrl: string | null;
  phoneNumber: string;
  address: string;
}) {
  return apiRequest<BusinessSettingsDto>("/api/business-settings/profile", {
    method: "PUT",
    body: input,
  });
}

export function updateNotificationSettings(input: NotificationSettingsInput) {
  return apiRequest<BusinessSettingsDto>(
    "/api/business-settings/notification-settings",
    { method: "PUT", body: input },
  );
}

export function getOperatingDays(
  settings: BusinessSettingsDto,
  fallback: OperatingDay[],
) {
  return parseJsonArray(settings.operatingHours, fallback);
}

export function getPickupWindows(
  settings: BusinessSettingsDto,
  fallback: PickupWindowSetting[],
) {
  return parseJsonArray(settings.pickupTimeWindows, fallback);
}

export async function updateSchedules(
  days: OperatingDay[],
  windows: PickupWindowSetting[],
) {
  await apiRequest<BusinessSettingsDto>(
    "/api/business-settings/operating-hours",
    { method: "PUT", body: { operatingHours: JSON.stringify(days) } },
  );
  return apiRequest<BusinessSettingsDto>(
    "/api/business-settings/pickup-times",
    {
      method: "PUT",
      body: { pickupTimeWindows: JSON.stringify(windows) },
    },
  );
}

export function updatePaymentMethods(input: {
  isCashOnDeliveryEnabled: boolean;
  isQrCodeOnlinePaymentEnabled: boolean;
}) {
  return apiRequest<BusinessSettingsDto>(
    "/api/business-settings/payment-methods",
    { method: "PUT", body: input },
  );
}

export async function getLaundryServices() {
  const services = await apiRequest<LaundryServiceDto[]>(
    "/api/services-pricing/services?activeOnly=false",
    { authenticated: false },
  );
  return services.map(toServiceSetting);
}

export async function setLaundryServiceAvailability(
  serviceId: string,
  isActive: boolean,
) {
  const service = await apiRequest<LaundryServiceDto>(
    `/api/services-pricing/services/${serviceId}/availability`,
    { method: "PUT", body: { isActive } },
  );
  return toServiceSetting(service);
}

export async function createLaundryService(input: LaundryServiceInput) {
  const service = await apiRequest<LaundryServiceDto>(
    "/api/services-pricing/services",
    { method: "POST", body: input },
  );
  return toServiceSetting(service);
}

export async function updateLaundryService(
  serviceId: string,
  input: LaundryServiceInput,
) {
  await apiRequest<LaundryServiceDto>(
    `/api/services-pricing/services/${serviceId}`,
    {
      method: "PUT",
      body: {
        name: input.name,
        description: input.description,
        supportsPickupAndDelivery: input.supportsPickupAndDelivery,
      },
    },
  );

  const service = await apiRequest<LaundryServiceDto>(
    `/api/services-pricing/services/${serviceId}/pricing`,
    {
      method: "PUT",
      body: {
        unitLabel: input.unitLabel,
        basePrice: input.basePrice,
        deliveryFee: input.deliveryFee,
      },
    },
  );
  return toServiceSetting(service);
}
