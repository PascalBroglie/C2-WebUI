import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { OgcServiceRegistryBuilder } from './core/builders/ogc-service-registry.builder';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideHttpClient(withFetch()),
    new OgcServiceRegistryBuilder()
      .registerWms()
      .registerWfs()
      .build(),
  ],
};
