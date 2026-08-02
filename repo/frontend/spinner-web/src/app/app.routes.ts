import { type Routes } from '@angular/router';

import { CustomerBookingPage } from './features/customer-booking/customer-booking-page';

/**
 * The booking form is the site. The payment result is a second route because the
 * customer is sent back here by PayMongo, so it has to be reachable by URL.
 */
export const appRoutes: Routes = [
  { path: '', component: CustomerBookingPage, pathMatch: 'full' },
  {
    // Lazy: someone booking with Cash on Delivery never needs this code.
    loadComponent: () =>
      import('./features/payment/payment-complete-page').then(
        (module) => module.PaymentCompletePage,
      ),
    path: 'payment/complete',
  },
  { path: '**', redirectTo: '' },
];
