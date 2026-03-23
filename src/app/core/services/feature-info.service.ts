import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as Cesium from 'cesium';
import { WmsService } from './wms.service';

export interface FeatureInfoResult {
  layerTitle: string;
  content: string;
  format: 'json' | 'html' | 'text';
}

/** Preferred GetFeatureInfo response formats, in priority order. */
const INFO_FORMATS = [
  'application/json',
  'application/vnd.ogc.gml',
  'text/plain',
  'text/html',
];

@Injectable({ providedIn: 'root' })
export class FeatureInfoService {
  private http = inject(HttpClient);
  private wmsService = inject(WmsService);

  /** Results of the last GetFeatureInfo query. */
  readonly results = signal<FeatureInfoResult[]>([]);
  /** True while requests are in flight. */
  readonly loading = signal(false);
  /** Screen position of the last click (for panel placement). */
  readonly clickPosition = signal<{ x: number; y: number } | null>(null);

  /**
   * Set of layer IDs for which GetFeatureInfo is enabled.
   * Toggled individually from WmsLayerItemComponent.
   */
  private readonly queryLayerIds = new Set<string>();

  isQueryingLayer(layerId: string): boolean {
    return this.queryLayerIds.has(layerId);
  }

  toggleQueryLayer(layerId: string): void {
    if (this.queryLayerIds.has(layerId)) {
      this.queryLayerIds.delete(layerId);
    } else {
      this.queryLayerIds.add(layerId);
    }
  }

  /**
   * Queries all active queryable WMS layers at the clicked position.
   * @param screenPos  Pixel position on the Cesium canvas.
   * @param viewer     The Cesium viewer instance.
   */
  async query(screenPos: { x: number; y: number }, viewer: Cesium.Viewer): Promise<void> {
    // Determine which layers to query: those explicitly toggled, or all queryable ones
    // if none are explicitly toggled.
    const queryableLayers = this.wmsService.activeLayers().filter(l => l.queryable);
    if (queryableLayers.length === 0) return;

    const targetsLayers = this.queryLayerIds.size > 0
      ? queryableLayers.filter(l => this.queryLayerIds.has(l.layerId))
      : queryableLayers;

    if (targetsLayers.length === 0) return;

    // Compute the current view rectangle in geographic degrees.
    const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
    if (!rect) return;

    const west  = Cesium.Math.toDegrees(rect.west);
    const south = Cesium.Math.toDegrees(rect.south);
    const east  = Cesium.Math.toDegrees(rect.east);
    const north = Cesium.Math.toDegrees(rect.north);

    const width  = viewer.canvas.width;
    const height = viewer.canvas.height;

    this.loading.set(true);
    this.clickPosition.set(screenPos);
    this.results.set([]);

    const requests = targetsLayers.map(layer =>
      this.queryLayer(layer.serverUrl, layer.serverVersion, layer.layerName, layer.layerTitle,
        west, south, east, north, width, height, screenPos.x, screenPos.y)
    );

    const settled = await Promise.allSettled(requests);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<FeatureInfoResult | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((r): r is FeatureInfoResult => r !== null);

    this.results.set(results);
    this.loading.set(false);
  }

  clear(): void {
    this.results.set([]);
    this.clickPosition.set(null);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async queryLayer(
    serverUrl: string,
    version: '1.1.1' | '1.3.0',
    layerName: string,
    layerTitle: string,
    west: number, south: number, east: number, north: number,
    width: number, height: number,
    pixelX: number, pixelY: number
  ): Promise<FeatureInfoResult | null> {
    const is130 = version === '1.3.0';
    const sep = serverUrl.includes('?') ? '&' : '?';

    // WMS 1.3.0 with CRS=CRS:84 uses x,y order (lon,lat) same as 1.1.1 EPSG:4326.
    const bbox = `${west},${south},${east},${north}`;
    const crsParam = is130 ? 'CRS=CRS:84' : 'SRS=EPSG:4326';
    const pixelParam = is130 ? `I=${Math.round(pixelX)}&J=${Math.round(pixelY)}` : `X=${Math.round(pixelX)}&Y=${Math.round(pixelY)}`;

    for (const infoFormat of INFO_FORMATS) {
      const url =
        `${serverUrl}${sep}SERVICE=WMS&VERSION=${version}&REQUEST=GetFeatureInfo` +
        `&LAYERS=${encodeURIComponent(layerName)}&QUERY_LAYERS=${encodeURIComponent(layerName)}` +
        `&${crsParam}&BBOX=${bbox}&WIDTH=${width}&HEIGHT=${height}` +
        `&${pixelParam}&INFO_FORMAT=${encodeURIComponent(infoFormat)}&FEATURE_COUNT=10`;

      try {
        const raw = await firstValueFrom(
          this.http.get(url, { responseType: 'text' })
        );

        const trimmed = raw.trim();
        if (!trimmed || this.isNoDataResponse(trimmed)) continue;

        return {
          layerTitle,
          content: trimmed,
          format: this.detectFormat(infoFormat, trimmed),
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  private isNoDataResponse(text: string): boolean {
    const lower = text.toLowerCase();
    // Common "no data" patterns across WMS implementations
    return (
      lower.includes('"features":[]') ||
      lower.includes('"numberreturned":0') ||
      lower === '{}' ||
      lower.startsWith('<?xml') && lower.includes('numberreturned="0"') ||
      lower.startsWith('<?xml') && lower.includes('<featurecollection') && lower.includes('numberoffeatures="0"')
    );
  }

  private detectFormat(infoFormat: string, content: string): 'json' | 'html' | 'text' {
    if (infoFormat.includes('json')) return 'json';
    if (infoFormat.includes('html') || content.trimStart().startsWith('<html')) return 'html';
    return 'text';
  }
}
