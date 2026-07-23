import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CustomerBookingPage } from './features/customer-booking/customer-booking-page';

@Component({
  selector: 'app-root',
  imports: [CustomerBookingPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
