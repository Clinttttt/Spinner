import { Component, input } from '@angular/core';

@Component({
  selector: 'app-service-card',
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss'
})
export class ServiceCard {
  name = input.required<string>();
  description = input('');
  price = input('');
  selected = input(false);
}
