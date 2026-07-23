import { TestBed } from '@angular/core/testing';

import { App } from './app';

describe('App', () => {
  it('renders the customer booking experience', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Book your laundry');
  });
});
