import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(
      appRoutes,
      // Landing on the payment result should start at the top, not wherever the
      // booking form happened to be scrolled to.
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
  ],
};
