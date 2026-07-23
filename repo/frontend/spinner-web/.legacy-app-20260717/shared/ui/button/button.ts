import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss'
})
export class Button {
  type = input<'button' | 'submit'>('button');
  variant = input<'primary' | 'secondary' | 'danger'>('primary');
  disabled = input(false);
}
