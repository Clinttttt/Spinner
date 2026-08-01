import type { PickupServiceLine, PickupTask } from "../models/pickup";
import type {
  PickupLocationDetails,
  PickupLocationSnapshot,
} from "../models/pickupLocation";

const peso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;

const paymentMethodLabels: Record<string, string> = {
  CashOnDelivery: "Cash on Delivery",
  QrCodeOnlinePayment: "QR Online Payment",
};

/**
 * Everything a confirmation needs, independent of which screen asked.
 *
 * Both the pickup list and the pickup location screen confirm the same real-world
 * action, so they resolve to this shape and share one builder rather than each
 * assembling its own partial summary.
 */
export interface PickupConfirmationSource {
  additionalNotes?: string;
  address: string;
  customerName: string;
  deliveryFee: number;
  location: PickupLocationSnapshot;
  paymentMethodCode: string;
  phone?: string;
  reference: string;
  serviceLines: PickupServiceLine[];
  serviceNames: string[];
  timeLabel: string;
  totalAmount: number;
}

export function confirmationSourceFromTask(
  task: PickupTask,
): PickupConfirmationSource {
  return {
    additionalNotes: task.additionalNotes,
    address: task.address,
    customerName: task.customerName,
    deliveryFee: task.deliveryFee,
    location: task.location,
    paymentMethodCode: task.paymentMethod,
    phone: task.phone,
    reference: task.bookingCode,
    serviceLines: task.serviceLines,
    serviceNames: task.services.map((service) => service.label),
    timeLabel: task.timeLabel,
    totalAmount: task.totalAmount,
  };
}

export function confirmationSourceFromDetails(
  details: PickupLocationDetails,
): PickupConfirmationSource {
  return {
    additionalNotes: details.additionalNotes,
    address: details.shortAddress,
    customerName: details.customerName,
    deliveryFee: details.deliveryFee,
    location: details.location,
    paymentMethodCode: details.paymentMethodCode,
    phone: details.customerPhone,
    reference: details.orderCode,
    serviceLines: details.serviceLines,
    serviceNames: details.services.map((service) => service.label),
    timeLabel: details.pickupTime,
    totalAmount: details.totalAmount,
  };
}

/**
 * The lines quoted back to the owner before a pickup is confirmed or collected.
 *
 * Collecting laundry is the point of no return for the customer's instructions:
 * once the bags are in the van, a wrong service or a missed landmark costs a
 * second trip. So the confirmation repeats what the customer actually booked
 * instead of only the name and time.
 */
export function buildPickupConfirmationLines(
  source: PickupConfirmationSource,
): string[] {
  const lines: string[] = [`${source.reference} · ${source.customerName}`];

  if (source.phone) lines.push(`Contact: ${source.phone}`);
  if (source.timeLabel) lines.push(`Schedule: ${source.timeLabel}`);

  if (source.serviceLines.length > 0) {
    for (const line of source.serviceLines) {
      const unit = line.unitLabel || "load";
      lines.push(
        `${line.name} — ${line.quantity} ${unit}${line.quantity === 1 ? "" : "s"} · ${peso(line.subtotal)}`,
      );
    }
  } else if (source.serviceNames.length > 0) {
    // Orders placed before services were itemised only carry names.
    lines.push(`Services: ${source.serviceNames.join(", ")}`);
  }

  if (source.deliveryFee > 0) {
    lines.push(`Pickup & delivery: ${peso(source.deliveryFee)}`);
  }
  if (source.totalAmount > 0) lines.push(`Total: ${peso(source.totalAmount)}`);
  const paymentLabel =
    paymentMethodLabels[source.paymentMethodCode] ??
    (source.paymentMethodCode || "—");
  lines.push(`Payment: ${paymentLabel}`);

  const address = source.location.formattedAddress || source.address;
  if (address) lines.push(`Address: ${address}`);
  if (source.location.landmark) {
    lines.push(`Landmark: ${source.location.landmark}`);
  }
  if (source.location.pickupInstructions) {
    lines.push(`Instructions: ${source.location.pickupInstructions}`);
  }
  if (source.additionalNotes) {
    lines.push(`Customer notes: ${source.additionalNotes}`);
  }

  return lines;
}
