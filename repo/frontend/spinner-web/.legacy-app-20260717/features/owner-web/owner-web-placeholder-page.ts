import { Component } from '@angular/core';
import { Card } from '../../shared/ui/card/card';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { PageContainer } from '../../shared/layout/page-container/page-container';

@Component({
  selector: 'app-owner-web-placeholder-page',
  imports: [Card, EmptyState, PageContainer],
  templateUrl: './owner-web-placeholder-page.html',
  styleUrl: './owner-web-placeholder-page.scss'
})
export class OwnerWebPlaceholderPage {}
