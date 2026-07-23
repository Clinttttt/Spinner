import { Component } from '@angular/core';
import { Card } from '../../shared/ui/card/card';
import { NoticeCard } from '../../shared/ui/notice-card/notice-card';
import { PageContainer } from '../../shared/layout/page-container/page-container';
import { SummaryRow } from '../../shared/ui/summary-row/summary-row';

@Component({
  selector: 'app-payment-page',
  imports: [Card, NoticeCard, PageContainer, SummaryRow],
  templateUrl: './payment-page.html',
  styleUrl: './payment-page.scss'
})
export class PaymentPage {}
