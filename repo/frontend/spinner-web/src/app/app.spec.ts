import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
  /**
   * The shell became a router outlet when the payment result page was added, so
   * this checks the routing actually resolves rather than only that a component
   * compiles. A broken route would otherwise show as a blank page.
   */
  it('renders the booking form at the root route', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigate(['/']);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Book your laundry');
  });

  it('sends an unknown path back to the booking form', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigate(['/does-not-exist']);
    fixture.detectChanges();

    expect(router.url).toBe('/');
  });
});
