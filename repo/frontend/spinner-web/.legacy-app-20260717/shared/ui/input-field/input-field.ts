import { Component, input } from '@angular/core';

@Component({
  selector: 'app-input-field',
  templateUrl: './input-field.html',
  styleUrl: './input-field.scss'
})
export class InputField {
  label = input.required<string>();
  placeholder = input('');
  type = input('text');
}
