import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.scss'
})
export class Card {
  tone = input<'default' | 'warm'>('default');
}
