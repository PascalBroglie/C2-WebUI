import {
  EnvironmentProviders,
  ExistingProvider,
  InjectionToken,
  makeEnvironmentProviders,
} from '@angular/core';
import { CesiumDataAdapter, OgcService } from '../models/ogc.model';
import { WmsService } from '../services/wms.service';
import { WfsService } from '../services/wfs.service';
import { CesiumLayerService } from '../services/cesium-layer.service';
import { CesiumWfsService } from '../services/cesium-wfs.service';

// ─── Injection tokens ─────────────────────────────────────────────────────────

/**
 * Multi-provider token for all registered OGC services.
 * Inject as `inject(OGC_SERVICES_TOKEN)` to get `OgcService[]`.
 */
export const OGC_SERVICES_TOKEN = new InjectionToken<OgcService[]>('OGC_SERVICES');

/**
 * Multi-provider token for all Cesium rendering adapters.
 * CesiumViewerComponent iterates over these to call setViewer() on init.
 */
export const CESIUM_ADAPTERS_TOKEN = new InjectionToken<CesiumDataAdapter[]>(
  'CESIUM_ADAPTERS'
);

// ─── Registry builder ─────────────────────────────────────────────────────────

/**
 * Fluent builder that registers OGC services and their Cesium adapters into
 * Angular's dependency injection system.
 *
 * Each `register*()` call adds both:
 *   - the OGC service to `OGC_SERVICES_TOKEN`  (consumed by LayerManagerComponent)
 *   - its Cesium adapter to `CESIUM_ADAPTERS_TOKEN` (consumed by CesiumViewerComponent)
 *
 * @example
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     ...
 *     new OgcServiceRegistryBuilder()
 *       .registerWms()
 *       .registerWfs()
 *       .build(),
 *   ],
 * };
 */
export class OgcServiceRegistryBuilder {
  private readonly serviceProviders: ExistingProvider[] = [];
  private readonly adapterProviders: ExistingProvider[] = [];

  /**
   * Registers the WMS service (WmsService) and its Cesium adapter
   * (CesiumLayerService — WebMapServiceImageryProvider).
   */
  registerWms(): this {
    this.serviceProviders.push({
      provide: OGC_SERVICES_TOKEN,
      useExisting: WmsService,
      multi: true,
    });
    this.adapterProviders.push({
      provide: CESIUM_ADAPTERS_TOKEN,
      useExisting: CesiumLayerService,
      multi: true,
    });
    return this;
  }

  /**
   * Registers the WFS service (WfsService) and its Cesium adapter
   * (CesiumWfsService — GeoJsonDataSource).
   */
  registerWfs(): this {
    this.serviceProviders.push({
      provide: OGC_SERVICES_TOKEN,
      useExisting: WfsService,
      multi: true,
    });
    this.adapterProviders.push({
      provide: CESIUM_ADAPTERS_TOKEN,
      useExisting: CesiumWfsService,
      multi: true,
    });
    return this;
  }

  /** Produces the Angular EnvironmentProviders to spread into the providers array. */
  build(): EnvironmentProviders {
    return makeEnvironmentProviders([
      ...this.serviceProviders,
      ...this.adapterProviders,
    ]);
  }
}
