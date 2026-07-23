import { Component, input } from '@angular/core';

@Component({
  selector: 'app-summary-row',
  templateUrl: './summary-row.html',
  styleUrl: './summary-row.scss'
})
export class SummaryRow {
  label = input.required<string>();
  value = input.required<string>();
  strong = input(false);
}
