import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'book',
    loadComponent: () =>
      import('./features/customer-booking/customer-booking-page').then((m) => m.CustomerBookingPage)
  },
  {
    path: 'booking-confirmation/:orderCode',
    loadComponent: () =>
      import('./features/customer-confirmation/customer-confirmation-page').then(
        (m) => m.CustomerConfirmationPage
      )
  },
  {
    path: 'track/:orderCode',
    loadComponent: () =>
      import('./features/customer-tracking/customer-tracking-page').then((m) => m.CustomerTrackingPage)
  },
  {
    path: 'receipt/:receiptCode',
    loadComponent: () =>
      import('./features/customer-receipt/customer-receipt-page').then((m) => m.CustomerReceiptPage)
  },
  {
    path: 'pay/:paymentCode',
    loadComponent: () => import('./features/payment/payment-page').then((m) => m.PaymentPage)
  },
  {
    path: 'owner-web',
    loadComponent: () =>
      import('./features/owner-web/owner-web-placeholder-page').then((m) => m.OwnerWebPlaceholderPage)
  },
  { path: '', pathMatch: 'full', redirectTo: 'book' },
  { path: '**', redirectTo: 'book' }
];
