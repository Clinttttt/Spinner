import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  templateUrl: './status-pill.html',
  styleUrl: './status-pill.scss'
})
export class StatusPill {
  label = input.required<string>();
  tone = input<'neutral' | 'success' | 'warning' | 'danger'>('neutral');
}
