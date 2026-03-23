import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OgcServerConfig, OgcService, OgcServiceType } from '../models/ogc.model';
import {
  ActiveWfsLayer,
  WfsBoundingBox,
  WfsFeatureType,
  WfsServer,
  WfsServerConfig,
  WfsVersion,
  WFS_COLOR_PALETTE,
} from '../models/wfs.model';
import { CesiumWfsService } from './cesium-wfs.service';

const JSON_FORMATS = [
  'application/json',
  'application/vnd.geo+json',
  'json',
  'geojson',
  'text/javascript',
];

@Injectable({ providedIn: 'root' })
export class WfsService implements OgcService {
  private http = inject(HttpClient);
  private cesiumWfsService = inject(CesiumWfsService);

  // ─── OgcService identity ──────────────────────────────────────────────────

  readonly serviceType: OgcServiceType = 'WFS';
  readonly label = 'WFS';
  readonly icon = 'polyline';

  // ─── OgcService state ─────────────────────────────────────────────────────

  readonly servers = signal<WfsServer[]>([]);
  readonly activeLayers = signal<ActiveWfsLayer[]>([]);

  // ─── OgcService contract ──────────────────────────────────────────────────

  /**
   * Adds a WFS server by fetching its GetCapabilities document.
   * Accepts OgcServerConfig (interface) and narrows to WfsServerConfig internally.
   * Type safety is guaranteed upstream by WfsServerConfigBuilder.
   */
  async addServer(rawConfig: OgcServerConfig): Promise<void> {
    const config = rawConfig as WfsServerConfig;
    const url = this.normalizeUrl(config.url);
    const id = crypto.randomUUID();

    this.servers.update(list => [
      ...list,
      {
        id, url, title: config.label ?? url, version: '2.0.0', status: 'loading',
        featureTypes: [], jsonOutputFormats: [],
      },
    ]);

    const versionsToTry: WfsVersion[] = [
      config.preferredVersion ?? '2.0.0',
      config.preferredVersion === '1.1.0' ? '2.0.0' : '1.1.0',
    ];

    for (const version of versionsToTry) {
      try {
        const capUrl = `${url}?SERVICE=WFS&VERSION=${version}&REQUEST=GetCapabilities`;
        const xmlText = await firstValueFrom(this.http.get(capUrl, { responseType: 'text' }));
        const parsed = this.parseCapabilities(xmlText, id, config);
        this.updateServer(id, { ...parsed, status: 'ready' });
        return;
      } catch {
        // try next version
      }
    }

    this.updateServer(id, {
      status: 'error',
      error: 'Impossible de récupérer le GetCapabilities (WFS 2.0.0 et 1.1.0)',
    });
    throw new Error('WFS GetCapabilities failed');
  }

  removeServer(serverId: string): void {
    this.activeLayers()
      .filter(l => l.serverId === serverId)
      .forEach(l => this.cesiumWfsService.removeLayer(l.layerId));

    this.activeLayers.update(list => list.filter(l => l.serverId !== serverId));
    this.servers.update(list => list.filter(s => s.id !== serverId));
  }

  // ─── Feature type activation ──────────────────────────────────────────────

  async toggleFeatureType(server: WfsServer, ft: WfsFeatureType): Promise<void> {
    if (this.isFeatureTypeActive(ft.id)) {
      this.cesiumWfsService.removeLayer(ft.id);
      this.activeLayers.update(list => list.filter(l => l.layerId !== ft.id));
      return;
    }

    const outputFormat = this.resolveJsonFormat(server, ft);
    if (!outputFormat) {
      throw new Error(
        `Aucun format GeoJSON disponible pour "${ft.title}". ` +
        `Formats : ${ft.outputFormats.join(', ')}`
      );
    }

    const colorIndex = this.activeLayers().length % WFS_COLOR_PALETTE.length;
    const activeLayer: ActiveWfsLayer = {
      layerId: ft.id,
      serverId: server.id,
      serverUrl: server.url,
      serverVersion: server.version,
      featureTypeName: ft.name,
      featureTypeTitle: ft.title,
      outputFormat,
      featureCount: 0,
      loadStatus: 'loading',
      style: { color: WFS_COLOR_PALETTE[colorIndex], opacity: 0.85, strokeWidth: 2 },
      visible: true,
      opacity: 0.85,
      boundingBox: ft.boundingBox,
    };

    this.activeLayers.update(list => [...list, activeLayer]);

    try {
      const geoJson = await this.fetchFeatures(server, ft, outputFormat);
      const count = (geoJson as any)?.features?.length ?? 0;
      this.updateActiveLayer(ft.id, { loadStatus: 'ready', featureCount: count });
      await this.cesiumWfsService.loadGeoJson(ft.id, geoJson, activeLayer.style, ft.boundingBox);
    } catch (err: any) {
      this.updateActiveLayer(ft.id, {
        loadStatus: 'error',
        error: err?.message ?? 'Erreur lors du chargement des entités',
      });
      throw err;
    }
  }

  isFeatureTypeActive(layerId: string): boolean {
    return this.activeLayers().some(l => l.layerId === layerId);
  }

  getActiveLayer(layerId: string): ActiveWfsLayer | undefined {
    return this.activeLayers().find(l => l.layerId === layerId);
  }

  setOpacity(layerId: string, opacity: number): void {
    this.cesiumWfsService.setOpacity(layerId, opacity);
    this.updateActiveLayer(layerId, { opacity, style: { ...this.getActiveLayer(layerId)!.style, opacity } });
  }

  setColor(layerId: string, color: string): void {
    this.cesiumWfsService.setColor(layerId, color);
    this.updateActiveLayer(layerId, { style: { ...this.getActiveLayer(layerId)!.style, color } });
  }

  setVisibility(layerId: string, visible: boolean): void {
    this.cesiumWfsService.setVisibility(layerId, visible);
    this.updateActiveLayer(layerId, { visible });
  }

  zoomTo(layerId: string): void {
    this.cesiumWfsService.zoomTo(layerId);
  }

  // ─── GetCapabilities parsing ──────────────────────────────────────────────

  private parseCapabilities(
    xmlText: string,
    serverId: string,
    config: WfsServerConfig
  ): Partial<WfsServer> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (doc.querySelector('parsererror')) throw new Error('XML invalide');

    const root = doc.documentElement;
    const version = (root.getAttribute('version') ?? config.preferredVersion) as WfsVersion;

    const title =
      doc.querySelector('ServiceIdentification > Title')?.textContent?.trim() ??
      doc.querySelector('Service > Title')?.textContent?.trim() ??
      config.label ?? 'Serveur WFS';

    const abstract =
      doc.querySelector('ServiceIdentification > Abstract')?.textContent?.trim() ??
      doc.querySelector('Service > Abstract')?.textContent?.trim() ?? '';

    const jsonOutputFormats = this.parseServerJsonFormats(doc);

    const featureTypes = Array.from(doc.querySelectorAll('FeatureTypeList > FeatureType'))
      .map(el => this.parseFeatureType(el, serverId, version, jsonOutputFormats));

    return { title, abstract, version, featureTypes, jsonOutputFormats };
  }

  private parseServerJsonFormats(doc: Document): string[] {
    const values = Array.from(
      doc.querySelectorAll(
        'Operation[name="GetFeature"] Parameter[name="outputFormat"] Value, ' +
        'Operation[name="GetFeature"] Parameter[name="OutputFormat"] Value'
      )
    ).map(el => el.textContent?.trim() ?? '');

    const legacyValues = Array.from(doc.querySelectorAll('GetFeature ResultFormat *'))
      .map(el => el.tagName);

    return [...values, ...legacyValues]
      .filter(Boolean)
      .filter(f => JSON_FORMATS.some(j => f.toLowerCase().includes(j)));
  }

  private parseFeatureType(
    el: Element,
    serverId: string,
    version: WfsVersion,
    serverJsonFormats: string[]
  ): WfsFeatureType {
    const name = el.querySelector('Name')?.textContent?.trim() ?? '';
    const title = el.querySelector('Title')?.textContent?.trim() ?? name;
    const abstract = el.querySelector('Abstract')?.textContent?.trim();

    const defaultCrs =
      el.querySelector('DefaultCRS')?.textContent?.trim() ??
      el.querySelector('DefaultSRS')?.textContent?.trim() ??
      'EPSG:4326';

    const otherCrs = [
      ...Array.from(el.querySelectorAll('OtherCRS')).map(e => e.textContent?.trim() ?? ''),
      ...Array.from(el.querySelectorAll('OtherSRS')).map(e => e.textContent?.trim() ?? ''),
    ].filter(Boolean);

    const boundingBox =
      this.parseWgs84BoundingBox(el) ?? this.parseLatLongBoundingBox(el);

    const ftFormats = Array.from(el.querySelectorAll('OutputFormats Value'))
      .map(e => e.textContent?.trim() ?? '')
      .filter(f => JSON_FORMATS.some(j => f.toLowerCase().includes(j)));

    return {
      id: `${serverId}::${name}`,
      name, title, abstract, defaultCrs, otherCrs, boundingBox,
      outputFormats: ftFormats.length > 0 ? ftFormats : serverJsonFormats,
    };
  }

  private parseWgs84BoundingBox(el: Element): WfsBoundingBox | undefined {
    const bbox = el.querySelector('WGS84BoundingBox');
    if (!bbox) return undefined;
    const lower = bbox.querySelector('LowerCorner')?.textContent?.trim().split(' ');
    const upper = bbox.querySelector('UpperCorner')?.textContent?.trim().split(' ');
    if (!lower || !upper || lower.length < 2 || upper.length < 2) return undefined;
    return {
      minX: parseFloat(lower[0]), minY: parseFloat(lower[1]),
      maxX: parseFloat(upper[0]), maxY: parseFloat(upper[1]),
    };
  }

  private parseLatLongBoundingBox(el: Element): WfsBoundingBox | undefined {
    const bbox = el.querySelector('LatLongBoundingBox');
    if (!bbox) return undefined;
    return {
      minX: parseFloat(bbox.getAttribute('minx') ?? '0'),
      minY: parseFloat(bbox.getAttribute('miny') ?? '0'),
      maxX: parseFloat(bbox.getAttribute('maxx') ?? '0'),
      maxY: parseFloat(bbox.getAttribute('maxy') ?? '0'),
    };
  }

  // ─── GetFeature ───────────────────────────────────────────────────────────

  private async fetchFeatures(
    server: WfsServer,
    ft: WfsFeatureType,
    outputFormat: string
  ): Promise<object> {
    const is2x = server.version === '2.0.0';
    const params = new URLSearchParams({
      SERVICE: 'WFS',
      VERSION: server.version,
      REQUEST: 'GetFeature',
      [is2x ? 'TYPENAMES' : 'TYPENAME']: ft.name,
      OUTPUTFORMAT: outputFormat,
      [is2x ? 'COUNT' : 'MAXFEATURES']: '2000',
      SRSNAME: is2x ? 'urn:ogc:def:crs:EPSG::4326' : 'EPSG:4326',
    });
    const sep = server.url.includes('?') ? '&' : '?';
    return firstValueFrom(
      this.http.get<object>(`${server.url}${sep}${params}`, { responseType: 'json' as const })
    );
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private resolveJsonFormat(server: WfsServer, ft: WfsFeatureType): string | null {
    const candidates = ft.outputFormats.length > 0 ? ft.outputFormats : server.jsonOutputFormats;
    for (const preferred of JSON_FORMATS) {
      const match = candidates.find(f => f.toLowerCase().includes(preferred));
      if (match) return match;
    }
    return candidates[0] ?? null;
  }

  private normalizeUrl(raw: string): string {
    try {
      const u = new URL(raw.trim());
      return `${u.origin}${u.pathname}`;
    } catch {
      return raw.trim();
    }
  }

  private updateServer(id: string, patch: Partial<WfsServer>): void {
    this.servers.update(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  private updateActiveLayer(layerId: string, patch: Partial<ActiveWfsLayer>): void {
    this.activeLayers.update(list =>
      list.map(l => (l.layerId === layerId ? { ...l, ...patch } : l))
    );
  }
}
