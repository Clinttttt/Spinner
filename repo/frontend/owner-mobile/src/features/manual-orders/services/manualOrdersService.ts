import { ApiError, apiRequest } from "../../../api/apiClient";
import { getAllPages } from "../../../api/pagination";
import type {
  ManualOrder,
  ManualOrderApiStatus,
  ManualOrderDraft,
  ManualOrderMethod,
  ManualOrderStatus,
  ManualPaymentStatus,
  ManualServiceOption,
} from "../models/manualOrder";

interface LaundryServiceDto {
  id: string;
  name: string;
  unitLabel: string;
  basePrice: number;
  /**
   * Whether the shop offers this service for collection and return.
   *
   * Read rather than inferred from the fee. The two are set independently, so a service can
   * support pickup with no fee at all — free delivery — and treating a missing fee as "not
   * offered" would hide it from every pickup order.
   */
  supportsPickupAndDelivery: boolean;
  /** Null when no fee is configured, which is not the same as not being offered. */
  deliveryFee: number | null;
}

export interface ManualOrderCustomer {
  customerId: string;
  fullName: string;
  mobileNumber: string;
  emailAddress: string | null;
  totalOrders: number;
  lastOrderAt: string | null;
  totalSpent: number;
}

export function searchManualOrderCustomers(search: string) {
  const query = new URLSearchParams({ search }).toString();
  return getAllPages<ManualOrderCustomer>(`/api/customers?${query}`);
}

interface ManualOrderListDto {
  orderId: string;
  orderCode: string;
  customerName: string;
  mobileNumber: string;
  method: string;
  address: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  services: string[];
  totalAmount: number;
  createdAt: string;
}

interface OrderServiceDto {
  serviceId: string;
  name: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface ManualOrderDetailsDto extends Omit<
  ManualOrderListDto,
  "method" | "scheduledDate" | "scheduledTime" | "services" | "totalAmount"
> {
  emailAddress?: string;
  fulfillmentType: string;
  preferredDate: string;
  preferredTimeWindow: string;
  services: OrderServiceDto[];
  estimatedDeliveryFee: number;
  estimatedTotalAmount: number;
  additionalCharge: number;
  additionalChargeReason?: string;
  discount: number;
  discountReason?: string;
  additionalNotes?: string;
  specialInstructions?: string;
  preferredNotificationChannel: string;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function apiMethod(value: ManualOrderMethod) {
  if (value === "pickupDelivery") return "PickupAndDelivery";
  if (value === "dropOff") return "DropOff";
  return "WalkIn";
}

function uiMethod(value: string): ManualOrderMethod {
  if (value === "PickupAndDelivery") return "pickupDelivery";
  if (value === "DropOff") return "dropOff";
  return "walkIn";
}

function uiStatus(value: string): ManualOrderStatus {
  if (value === "BookingReceived") return "created";
  if (value === "Confirmed") return "confirmed";
  if (value === "PickedUp" || value === "BeingProcessed") return "inProcess";
  if (value === "ReadyForDelivery") return "ready";
  if (value === "Rejected") return "cancelled";
  return "completed";
}

function apiStatus(value: string): ManualOrderApiStatus {
  const supported: ManualOrderApiStatus[] = [
    "BookingReceived",
    "Confirmed",
    "PickedUp",
    "BeingProcessed",
    "ReadyForDelivery",
    "Completed",
    "Rejected",
  ];
  return supported.includes(value as ManualOrderApiStatus)
    ? (value as ManualOrderApiStatus)
    : "BookingReceived";
}

function uiPaymentStatus(dto: {
  paymentMethod: string;
  paymentStatus: string;
}): ManualPaymentStatus {
  if (dto.paymentStatus === "Paid") return "paid";
  return dto.paymentMethod === "QrCodeOnlinePayment"
    ? "waitingOnline"
    : "unpaid";
}

function scheduledAt(date: string, timeLabel: string) {
  const timeMatch = timeLabel.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) return `${date}T00:00:00`;
  let hour = Number(timeMatch[1]) % 12;
  if (timeMatch[3].toUpperCase() === "PM") hour += 12;
  return `${date}T${String(hour).padStart(2, "0")}:${timeMatch[2]}:00`;
}

export function calculateManualOrder(
  draft: ManualOrderDraft,
  availableServices: ManualServiceOption[],
) {
  const services = draft.selectedServiceIds.map((serviceId) => {
    const service = availableServices.find((item) => item.id === serviceId);
    if (!service) {
      throw new Error("A selected service is no longer available.");
    }
    return {
      name: service.name,
      quantity: draft.loadCount,
      serviceId,
      subtotal: service.price * draft.loadCount,
      unitLabel: service.unitLabel,
      unitPrice: service.price,
    };
  });
  const serviceAmount = services.reduce(
    (total, item) => total + item.subtotal,
    0,
  );

  /**
   * What the trip costs, worked out from the services actually chosen.
   *
   * The screen used to put a flat 60 here whenever the method was pickup and delivery,
   * which was nobody's configured fee in particular: the server charges what the services
   * are set to, so the owner could be quoted one figure and the customer charged another.
   *
   * Charged once at the highest rate among the chosen services, because it is one trip.
   * That is the rule the customer website already quotes, and the server now applies the
   * same one.
   */
  const deliveryFee =
    draft.method === "pickupDelivery"
      ? draft.selectedServiceIds.reduce((highest, serviceId) => {
          const service = availableServices.find(
            (item) => item.id === serviceId,
          );
          return Math.max(highest, service?.deliveryFee ?? 0);
        }, 0)
      : 0;

  const totalAmount = Math.max(
    0,
    serviceAmount + deliveryFee + draft.additionalCharge - draft.discount,
  );
  return { deliveryFee, serviceAmount, services, totalAmount };
}

/**
 * The calendar date a "Today" or "Tomorrow" label means, in the shop's own day.
 *
 * Built from the local date parts rather than toISOString, which converts to UTC first.
 * The shop is UTC+8, so between midnight and 08:00 the UTC date is still yesterday, and a
 * manual order taken at one in the morning was filed against the previous day. It then
 * disappeared from today's list and landed in the wrong day's figures.
 *
 * Matches localDate in pickupStore, which already does this correctly.
 */
function dateFromLabel(label: string) {
  const date = new Date();
  if (/tomorrow/i.test(label)) date.setDate(date.getDate() + 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mapListOrder(dto: ManualOrderListDto): ManualOrder {
  const method = uiMethod(dto.method);
  return {
    additionalCharge: 0,
    apiStatus: apiStatus(dto.status),
    address: dto.address === "In-store" ? undefined : dto.address,
    createdAt: dto.createdAt,
    customerName: dto.customerName,
    deliveryFee: 0,
    discount: 0,
    id: dto.orderId,
    method,
    orderCode: dto.orderCode,
    paymentMethod:
      dto.paymentMethod === "QrCodeOnlinePayment" ? "qrOnline" : "cash",
    paymentStatus: uiPaymentStatus(dto),
    phone: dto.mobileNumber,
    preferredNotificationChannel: "sms",
    scheduledAt: scheduledAt(dto.scheduledDate, dto.scheduledTime),
    scheduleLabel: `${methodLabel(method)} · ${dto.scheduledDate} · ${dto.scheduledTime}`,
    services: dto.services.map((name, index) => ({
      name,
      quantity: 1,
      serviceId: normalize(name),
      subtotal: index === 0 ? dto.totalAmount : 0,
      unitLabel: "per load",
      unitPrice: index === 0 ? dto.totalAmount : 0,
    })),
    source: "ownerManual",
    status: uiStatus(dto.status),
    totalAmount: dto.totalAmount,
  };
}

function mapDetails(dto: ManualOrderDetailsDto): ManualOrder {
  const method = uiMethod(dto.fulfillmentType);
  return {
    additionalCharge: dto.additionalCharge,
    apiStatus: apiStatus(dto.status),
    additionalChargeReason: dto.additionalChargeReason,
    address: dto.address === "In-store" ? undefined : dto.address,
    createdAt: dto.createdAt,
    customerName: dto.customerName,
    deliveryFee: dto.estimatedDeliveryFee,
    discount: dto.discount,
    discountReason: dto.discountReason,
    email: dto.emailAddress,
    id: dto.orderId,
    method,
    notes: dto.additionalNotes,
    orderCode: dto.orderCode,
    paymentMethod:
      dto.paymentMethod === "QrCodeOnlinePayment" ? "qrOnline" : "cash",
    paymentStatus: uiPaymentStatus(dto),
    phone: dto.mobileNumber,
    preferredNotificationChannel:
      dto.preferredNotificationChannel.toLowerCase() as ManualOrder["preferredNotificationChannel"],
    scheduledAt: scheduledAt(dto.preferredDate, dto.preferredTimeWindow),
    scheduleLabel: `${methodLabel(method)} · ${dto.preferredDate} · ${dto.preferredTimeWindow}`,
    services: dto.services.map((service) => ({
      name: service.name,
      quantity: service.quantity,
      serviceId: service.serviceId,
      subtotal: service.subtotal,
      unitLabel: service.unitLabel,
      unitPrice: service.unitPrice,
    })),
    source: "ownerManual",
    specialInstructions: dto.specialInstructions,
    status: uiStatus(dto.status),
    totalAmount: dto.estimatedTotalAmount,
  };
}

export async function getManualOrders() {
  const response = await getAllPages<ManualOrderListDto>("/api/manual-orders");
  return response.map(mapListOrder);
}

export async function getManualOrderServices(): Promise<ManualServiceOption[]> {
  const services = await apiRequest<LaundryServiceDto[]>(
    "/api/services-pricing/services",
    { authenticated: false },
  );
  return services.map((service) => ({
    deliveryFee: service.deliveryFee,
    id: service.id,
    name: service.name,
    price: service.basePrice,
    supportsPickupAndDelivery: service.supportsPickupAndDelivery,
    unitLabel: service.unitLabel,
  }));
}

export async function getManualOrderDetails(id: string) {
  return mapDetails(
    await apiRequest<ManualOrderDetailsDto>(`/api/manual-orders/${id}`),
  );
}

/** Raised when the API detects a near-identical order the owner may not want. */
export class PossibleDuplicateOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PossibleDuplicateOrderError";
  }
}

export async function createManualOrder(
  draft: ManualOrderDraft,
  options: { allowDuplicate?: boolean } = {},
): Promise<ManualOrder> {
  const selectedServices = draft.selectedServiceIds.map((serviceId) => ({
    quantity: draft.loadCount,
    serviceId,
  }));

  try {
    const dto = await apiRequest<ManualOrderDetailsDto>("/api/manual-orders", {
      body: {
        additionalCharge: draft.additionalCharge,
        additionalChargeReason: draft.additionalChargeReason || null,
        address: draft.address || null,
        allowDuplicate: options.allowDuplicate ?? false,
        customerName: draft.customerName.trim(),
        discount: draft.discount,
        discountReason: draft.discountReason || null,
        emailAddress: draft.email.trim() || null,
        method: apiMethod(draft.method),
        mobileNumber: draft.phone.trim(),
        notes: draft.notes.trim() || null,
        paymentMethod:
          draft.paymentMethod === "qrOnline"
            ? "QrCodeOnlinePayment"
            : "CashOnDelivery",
        pickupLocation: null,
        preferredNotificationChannel:
          draft.preferredNotificationChannel === "sms"
            ? "Sms"
            : draft.preferredNotificationChannel === "email"
              ? "Email"
              : draft.preferredNotificationChannel === "both"
                ? "Both"
                : "None",
        scheduledDate: dateFromLabel(draft.scheduleLabel),
        scheduledTime: draft.scheduleLabel,
        services: selectedServices,
        specialInstructions: draft.specialInstructions.trim() || null,
      },
      method: "POST",
    });
    return mapDetails(dto);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "order.possible_duplicate"
    ) {
      throw new PossibleDuplicateOrderError(error.message);
    }
    throw error;
  }
}

/** Removes a finished order from the active list without deleting it. */
export async function clearManualOrder(orderId: string) {
  await apiRequest(`/api/orders/${orderId}/archive`, { method: "POST" });
}

export async function advanceManualOrder(order: ManualOrder) {
  if (
    order.apiStatus === "ReadyForDelivery" &&
    order.paymentStatus === "unpaid"
  ) {
    await apiRequest(`/api/payments/${order.id}/cod/confirm`, {
      method: "POST",
    });
    return getManualOrderDetails(order.id);
  }

  // A pickup order can only leave Confirmed by being collected. Posting
  // BeingProcessed here used to fail with a status-transition conflict.
  if (order.apiStatus === "Confirmed" && order.method === "pickupDelivery") {
    await apiRequest(`/api/pickups/${order.id}/picked-up`, { method: "POST" });
    return getManualOrderDetails(order.id);
  }

  const next: Partial<Record<ManualOrderApiStatus, ManualOrderApiStatus>> = {
    BookingReceived: "Confirmed",
    Confirmed: "BeingProcessed",
    PickedUp: "BeingProcessed",
    BeingProcessed: "ReadyForDelivery",
    ReadyForDelivery: "Completed",
  };
  const status = next[order.apiStatus];
  if (!status) return order;
  await apiRequest(`/api/orders/${order.id}/status`, {
    body: { status },
    method: "POST",
  });
  return getManualOrderDetails(order.id);
}

export function manualOrderAction(order: ManualOrder) {
  if (order.apiStatus === "Rejected" || order.apiStatus === "Completed") {
    return { disabled: true, label: "Completed" };
  }
  if (order.apiStatus === "BookingReceived") return { label: "Confirm Order" };
  if (order.apiStatus === "Confirmed" && order.method === "pickupDelivery") {
    return { label: "Mark Picked Up" };
  }
  if (order.apiStatus === "Confirmed" || order.apiStatus === "PickedUp") {
    return { label: "Start Processing" };
  }
  if (order.apiStatus === "BeingProcessed") return { label: "Mark Ready" };
  if (order.paymentStatus === "waitingOnline") {
    return { disabled: true, label: "Awaiting QR Payment" };
  }
  if (order.paymentStatus === "unpaid") {
    return { label: "Confirm Cash Payment" };
  }
  return { label: "Mark Completed" };
}

export function methodLabel(method: ManualOrderDraft["method"]) {
  if (method === "walkIn") return "Walk-in";
  if (method === "dropOff") return "Drop-off";
  return "Pickup & Delivery";
}
