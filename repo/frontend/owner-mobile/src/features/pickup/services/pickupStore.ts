import { useSyncExternalStore } from "react";

import { apiRequest } from "../../../api/apiClient";
import { getAllPages } from "../../../api/pagination";
import type {
  PaymentStatus,
  PickupFilter,
  PickupService,
  PickupServiceType,
  PickupStatus,
  PickupTask,
} from "../models/pickup";
import type {
  PickupLocationDetails,
  PickupLocationSnapshot,
  PickupLocationSource,
  PickupRoutePreview,
} from "../models/pickupLocation";
import { getBusinessSettings } from "../../settings/services/settingsService";

interface PickupLocationDto {
  barangay?: string;
  cityOrMunicipality?: string;
  confirmedAt?: string;
  formattedAddress: string;
  landmark?: string;
  latitude: number;
  locationConfirmed: boolean;
  locationSource: string;
  longitude: number;
  pickupInstructions?: string;
  placeId?: string;
  plusCode?: string;
}

interface PickupScheduleServiceDto {
  name: string;
  quantity: number;
  subtotal: number;
  unitLabel: string;
  unitPrice: number;
}

/**
 * `/api/pickups` returns everything the pickup list renders, so the screen no
 * longer issues one extra order request per row.
 */
interface PickupScheduleDto {
  additionalNotes?: string;
  address: string;
  awaitingConfirmation: boolean;
  customerName: string;
  estimatedDeliveryFee: number;
  estimatedServiceAmount: number;
  estimatedTotalAmount: number;
  loadCount: number;
  mobileNumber?: string;
  orderCode: string;
  orderId: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  pickupLocation?: PickupLocationDto;
  pickupStatus?: string;
  pickupUpdatedAt?: string;
  preferredDate: string;
  preferredTimeWindow: string;
  serviceLines?: PickupScheduleServiceDto[];
  services: string[];
  shortAddress: string;
  updatedAt: string;
}

interface OrderServiceDto {
  name: string;
  quantity: number;
  serviceId: string;
  subtotal: number;
  unitLabel: string;
  unitPrice: number;
}

interface OrderDetailsDto {
  additionalNotes?: string;
  address: string;
  archivedAt?: string;
  customerName: string;
  estimatedDeliveryFee: number;
  estimatedServiceAmount: number;
  estimatedTotalAmount: number;
  loadCount: number;
  mobileNumber: string;
  orderCode: string;
  orderId: string;
  paymentMethod: string;
  paymentStatus: string;
  pickupLocation?: PickupLocationDto;
  pickupStatus?: string;
  pickupUpdatedAt?: string;
  preferredDate: string;
  preferredTimeWindow: string;
  services: OrderServiceDto[];
  status: string;
  updatedAt: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let pickupTasks: PickupTask[] = [];
let refreshPromise: Promise<PickupTask[]> | null = null;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return pickupTasks;
}

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scheduledAt(date: string, timeLabel: string) {
  const rangeMatch = timeLabel.match(/(\d{1,2}):(\d{2})/);
  const meridiemMatch = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]) % 12;
    if (meridiemMatch[3].toUpperCase() === "PM") hour += 12;
    return `${date}T${String(hour).padStart(2, "0")}:${meridiemMatch[2]}:00`;
  }

  // Customer web submits 24-hour windows such as "13:00-15:00".
  if (rangeMatch) {
    return `${date}T${rangeMatch[1].padStart(2, "0")}:${rangeMatch[2]}:00`;
  }

  return `${date}T00:00:00`;
}

function paymentStatus(dto: {
  paymentMethod: string;
  paymentStatus: string;
}): PaymentStatus {
  if (dto.paymentStatus === "Paid") return "paid";
  return dto.paymentMethod === "CashOnDelivery" ? "cod" : "unpaid";
}

function pickupStatus(value?: string): PickupStatus {
  if (value === "PickedUp") return "pickedUp";
  return value === "OnRoute" ? "onRoute" : "pending";
}

function serviceType(name: string): PickupServiceType {
  return name.toLowerCase().includes("self") ? "selfService" : "washDryFold";
}

function mapSource(value: string): PickupLocationSource {
  const normalized = value.charAt(0).toLowerCase() + value.slice(1);
  if (
    normalized === "currentLocation" ||
    normalized === "addressSearch" ||
    normalized === "manualPin" ||
    normalized === "savedCustomerLocation"
  ) {
    return normalized;
  }
  return "ownerFallback";
}

function mapLocation(
  location: PickupLocationDto | undefined,
  fallbackAddress: string,
): PickupLocationSnapshot {
  if (!location) {
    return {
      formattedAddress: fallbackAddress,
      source: "ownerFallback",
      status: "unavailable",
    };
  }

  const hasCoordinates =
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude);

  return {
    barangay: location.barangay,
    cityOrMunicipality: location.cityOrMunicipality,
    confirmedAt: location.confirmedAt,
    formattedAddress: location.formattedAddress || fallbackAddress,
    landmark: location.landmark,
    latitude: hasCoordinates ? location.latitude : undefined,
    longitude: hasCoordinates ? location.longitude : undefined,
    pickupInstructions: location.pickupInstructions,
    placeId: location.placeId,
    plusCode: location.plusCode,
    source: mapSource(location.locationSource),
    status: !hasCoordinates
      ? "missingCoordinates"
      : location.locationConfirmed
        ? "confirmed"
        : "needsConfirmation",
  };
}

function buildServices(orderId: string, names: string[]): PickupService[] {
  return [
    { id: `${orderId}-pickup`, label: "Pickup", type: "pickup" },
    ...names.map((name, index) => ({
      id: `${orderId}-${index}`,
      label: name.replace(/, /g, "/"),
      type: serviceType(name),
    })),
  ];
}

function isClearable(orderStatus: string) {
  return orderStatus === "Completed" || orderStatus === "Rejected";
}

function mapScheduleItem(
  dto: PickupScheduleDto,
  filterBucket: PickupFilter,
): PickupTask {
  return {
    additionalNotes: dto.additionalNotes,
    address: dto.shortAddress || dto.address,
    awaitingConfirmation: dto.awaitingConfirmation,
    bookingCode: dto.orderCode,
    canClear: isClearable(dto.orderStatus),
    completedAt: dto.pickupUpdatedAt,
    customerName: dto.customerName,
    deliveryFee: dto.estimatedDeliveryFee ?? 0,
    filterBucket,
    id: dto.orderId,
    loadCount: dto.loadCount ?? 0,
    location: mapLocation(dto.pickupLocation, dto.address),
    orderStatus: dto.orderStatus,
    paymentMethod: dto.paymentMethod,
    paymentStatus: paymentStatus(dto),
    phone: dto.mobileNumber,
    pickupStatus: pickupStatus(dto.pickupStatus),
    scheduledAt: scheduledAt(dto.preferredDate, dto.preferredTimeWindow),
    serviceAmount: dto.estimatedServiceAmount ?? 0,
    serviceLines: dto.serviceLines ?? [],
    services: buildServices(dto.orderId, dto.services),
    timeLabel: dto.preferredTimeWindow,
    totalAmount: dto.estimatedTotalAmount ?? 0,
  };
}

function mapOrderDetails(
  dto: OrderDetailsDto,
  filterBucket: PickupFilter,
): PickupTask {
  return {
    additionalNotes: dto.additionalNotes,
    address: dto.address,
    awaitingConfirmation: dto.status === "BookingReceived",
    bookingCode: dto.orderCode,
    canClear: isClearable(dto.status),
    completedAt: dto.pickupUpdatedAt,
    customerName: dto.customerName,
    deliveryFee: dto.estimatedDeliveryFee ?? 0,
    filterBucket,
    id: dto.orderId,
    loadCount: dto.loadCount ?? 0,
    location: mapLocation(dto.pickupLocation, dto.address),
    orderStatus: dto.status,
    paymentMethod: dto.paymentMethod,
    paymentStatus: paymentStatus(dto),
    phone: dto.mobileNumber,
    pickupStatus: pickupStatus(dto.pickupStatus),
    scheduledAt: scheduledAt(dto.preferredDate, dto.preferredTimeWindow),
    serviceAmount: dto.estimatedServiceAmount ?? 0,
    serviceLines: (dto.services ?? []).map((service) => ({
      name: service.name,
      quantity: service.quantity,
      subtotal: service.subtotal,
      unitLabel: service.unitLabel,
      unitPrice: service.unitPrice,
    })),
    services: buildServices(
      dto.orderId,
      dto.services.map((service) => service.name),
    ),
    timeLabel: dto.preferredTimeWindow,
    totalAmount: dto.estimatedTotalAmount ?? 0,
  };
}

async function loadSchedule(date: string, bucket: PickupFilter) {
  const schedule = await getAllPages<PickupScheduleDto>(
    `/api/pickups?date=${encodeURIComponent(date)}`,
  );
  return schedule.map((item) => mapScheduleItem(item, bucket));
}

function replaceTask(next: PickupTask) {
  pickupTasks = pickupTasks.map((item) => (item.id === next.id ? next : item));
  emitChange();
}

/**
 * Where the shop is, for drawing the trip on the pickup map.
 *
 * Cached because it changes about never and every pickup screen needs it. Read from
 * business settings, which is where the owner sets the pickup origin.
 */
let businessOrigin: { latitude: number; longitude: number } | null = null;
let businessOriginPromise: Promise<void> | null = null;

async function ensureBusinessOriginAsync() {
  if (businessOrigin || businessOriginPromise)
    return businessOriginPromise ?? undefined;

  businessOriginPromise = getBusinessSettings()
    .then((settings) => {
      const latitude = settings.pickupOriginLatitude;
      const longitude = settings.pickupOriginLongitude;

      if (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude)
      ) {
        businessOrigin = { latitude, longitude };
      }
    })
    .catch(() => {
      // The map simply shows the pickup pin without a trip. Not worth an error: the
      // rider can still see where they are going.
    })
    .finally(() => {
      businessOriginPromise = null;
    });

  return businessOriginPromise;
}

/**
 * The trip between the shop and the pickup point.
 *
 * A direct line rather than a driving route. Turn-by-turn directions need a paid
 * directions service, and on a rural purok the useful information is which way and how
 * far, which a straight line already answers. "Open in Maps" remains there for the
 * actual navigation.
 */
function buildRoutePreview(item: PickupTask): PickupRoutePreview | undefined {
  if (!businessOrigin) return undefined;

  const { latitude, longitude } = item.location;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
    return undefined;

  return {
    coordinates: [
      { latitude: latitude as number, longitude: longitude as number },
      businessOrigin,
    ],
    origin: businessOrigin,
  };
}

function toLocationDetails(item: PickupTask): PickupLocationDetails {
  return {
    additionalNotes: item.additionalNotes,
    awaitingConfirmation: item.awaitingConfirmation,
    customerName: item.customerName,
    customerPhone: item.phone,
    deliveryFee: item.deliveryFee,
    location: { ...item.location },
    orderCode: item.bookingCode,
    paymentMethod: item.paymentStatus,
    paymentMethodCode: item.paymentMethod,
    pickupId: item.id,
    pickupStatus: item.pickupStatus,
    pickupTime: item.timeLabel,
    routePreview: item.routePreview ?? buildRoutePreview(item),
    serviceLines: item.serviceLines.map((line) => ({ ...line })),
    services: item.services.map((service) => ({ ...service })),
    shortAddress: item.address,
    totalAmount: item.totalAmount,
  };
}

export function usePickupTasks() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function refreshPickupTasks() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = Promise.all([
    loadSchedule(localDate(), "today"),
    loadSchedule(localDate(1), "tomorrow"),
  ])
    .then(([today, tomorrow]) => [...today, ...tomorrow])
    .then((next) => {
      pickupTasks = next;
      emitChange();
      return next;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

async function reloadTask(id: string) {
  const dto = await apiRequest<OrderDetailsDto>(`/api/orders/${id}`);
  const existing = pickupTasks.find((item) => item.id === id);
  const next = mapOrderDetails(dto, existing?.filterBucket ?? "today");
  if (existing) replaceTask(next);
  return next;
}

/**
 * Approves a customer booking that reached the pickup schedule before the owner
 * confirmed it. Without this the rider could only see the job, not accept it.
 */
export async function confirmPickupBooking(id: string) {
  await apiRequest(`/api/bookings/${id}/confirm`, { method: "POST" });
  return reloadTask(id);
}

export async function markPickupPickedUp(id: string) {
  await apiRequest(`/api/pickups/${id}/picked-up`, { method: "POST" });
  return reloadTask(id);
}

export async function failPickupTask(id: string) {
  await apiRequest(`/api/pickups/${id}/fail`, {
    body: { reason: "Pickup cancelled by owner." },
    method: "POST",
  });
  pickupTasks = pickupTasks.filter((item) => item.id !== id);
  emitChange();
}

/** Removes a finished pickup from the list without deleting the order. */
export async function clearPickupTask(id: string) {
  await apiRequest(`/api/orders/${id}/archive`, { method: "POST" });
  pickupTasks = pickupTasks.filter((item) => item.id !== id);
  emitChange();
}

export function updatePickupStatus(id: string, status: PickupStatus) {
  pickupTasks = pickupTasks.map((item) =>
    item.id === id ? { ...item, pickupStatus: status } : item,
  );
  emitChange();
}

export async function advancePickupStatus(id: string) {
  const current = pickupTasks.find((item) => item.id === id);
  if (!current) return null;
  if (current.awaitingConfirmation) {
    const confirmed = await confirmPickupBooking(id);
    return toLocationDetails(confirmed);
  }
  if (current.pickupStatus === "pending") {
    const next = { ...current, pickupStatus: "onRoute" as const };
    replaceTask(next);
    return toLocationDetails(next);
  }
  if (current.pickupStatus === "onRoute") {
    const next = await markPickupPickedUp(id);
    return toLocationDetails(next);
  }
  return toLocationDetails(current);
}

export async function loadPickupLocation(
  pickupId: string,
): Promise<PickupLocationDetails | null> {
  // Awaited so the trip is on the map the first time it opens, rather than appearing a
  // moment later once the shop's own coordinates arrive.
  await ensureBusinessOriginAsync();

  const existing = pickupTasks.find((item) => item.id === pickupId);
  if (existing) return toLocationDetails(existing);
  const dto = await apiRequest<OrderDetailsDto>(`/api/orders/${pickupId}`);
  return toLocationDetails(mapOrderDetails(dto, "today"));
}
