import { Component, input } from '@angular/core';

@Component({
  selector: 'app-notice-card',
  templateUrl: './notice-card.html',
  styleUrl: './notice-card.scss'
})
export class NoticeCard {
  title = input.required<string>();
  message = input.required<string>();
  tone = input<'info' | 'success' | 'warning' | 'danger'>('info');
}
