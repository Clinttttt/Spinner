import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-customer-header',
  imports: [RouterLink],
  templateUrl: './customer-header.html',
  styleUrl: './customer-header.scss'
})
export class CustomerHeader {
  subtitle = input('Customer web app');
}
