import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-container',
  templateUrl: './page-container.html',
  styleUrl: './page-container.scss'
})
export class PageContainer {
  eyebrow = input('');
  title = input.required<string>();
  description = input('');
}
