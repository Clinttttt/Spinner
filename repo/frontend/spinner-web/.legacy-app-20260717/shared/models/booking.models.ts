export type FulfillmentType = 'PickupAndDelivery' | 'DropOff';

export type PaymentMethod = 'CashOnDelivery' | 'QrCodeOnlinePayment';

export type PaymentStatus = 'Unpaid' | 'Paid';

export type OrderStatus =
  | 'BookingReceived'
  | 'Confirmed'
  | 'PickedUp'
  | 'BeingProcessed'
  | 'ReadyForDelivery'
  | 'Completed'
  | 'Rejected';

export type ServiceResponse = {
  id: string;
  name: string;
  description: string | null;
  unitLabel: string;
  basePrice: number;
  supportsPickupAndDelivery: boolean;
  deliveryFee: number | null;
  isActive: boolean;
  updatedAt: string;
};

export type CreateBookingRequest = {
  fullName: string;
  mobileNumber: string;
  emailAddress: string | null;
  serviceId: string;
  fulfillmentType: FulfillmentType;
  address: string;
  preferredDate: string;
  preferredTimeWindow: string;
  paymentMethod: PaymentMethod;
  loadCount: number;
  additionalNotes: string | null;
};

export type BookingConfirmationResponse = {
  orderId: string;
  orderCode: string;
  trackingCode: string;
  customerName: string;
  mobileNumber: string;
  emailAddress: string | null;
  serviceName: string;
  unitLabel: string;
  loadCount: number;
  fulfillmentType: FulfillmentType;
  address: string;
  preferredDate: string;
  preferredTimeWindow: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  estimatedServiceAmount: number;
  estimatedDeliveryFee: number;
  estimatedTotalAmount: number;
  additionalNotes: string | null;
};

export type CustomerTrackingResponse = {
  orderCode: string;
  trackingCode: string;
  customerName: string;
  serviceName: string;
  fulfillmentType: FulfillmentType;
  preferredDate: string;
  preferredTimeWindow: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  customerFacingStatus: string;
  estimatedTotalAmount: number;
  updatedAt: string;
};

export type ReceiptResponse = {
  receiptTitle: string;
  receiptCode: string;
  orderCode: string;
  customerName: string;
  serviceName: string;
  loadCount: number;
  unitLabel: string;
  serviceAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
};
