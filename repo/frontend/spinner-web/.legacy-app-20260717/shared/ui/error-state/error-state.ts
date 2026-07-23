import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss'
})
export class ErrorState {
  title = input('Unable to load');
  message = input('Please try again.');
}
