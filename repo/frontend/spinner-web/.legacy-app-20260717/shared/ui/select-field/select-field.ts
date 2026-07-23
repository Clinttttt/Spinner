import { Component, input } from '@angular/core';

@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.html',
  styleUrl: './select-field.scss'
})
export class SelectField {
  label = input.required<string>();
  placeholder = input('Choose an option');
}
