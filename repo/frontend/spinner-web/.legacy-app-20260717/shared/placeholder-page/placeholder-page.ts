import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

type PlaceholderData = {
  eyebrow: string;
  title: string;
  description: string;
  actions: string[];
};

@Component({
  selector: 'app-placeholder-page',
  templateUrl: './placeholder-page.html',
  styleUrl: './placeholder-page.scss'
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly data = this.route.snapshot.data as PlaceholderData;
}
