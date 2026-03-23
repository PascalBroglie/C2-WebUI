import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActiveWfsLayer,
  WfsBoundingBox,
  WfsFeatureType,
  WfsServer,
  WfsVersion,
  WFS_COLOR_PALETTE,
} from '../models/wfs.model';
import { CesiumWfsService } from './cesium-wfs.service';

/** GeoJSON output format identifiers, in preference order */
const JSON_FORMATS = [
  'application/json',
  'application/vnd.geo+json',
  'json',
  'geojson',
  'text/javascript',
];

@Injectable({ providedIn: 'root' })
export class WfsService {
  private http = inject(HttpClient);
  private cesiumWfsService = inject(CesiumWfsService);

  readonly servers = signal<WfsServer[]>([]);
  readonly activeLayers = signal<ActiveWfsLayer[]>([]);

  // ─── Server management ───────────────────────────────────────────────────────

  async addServer(rawUrl: string): Promise<void> {
    const url = this.normalizeUrl(rawUrl);
    const id = crypto.randomUUID();

    this.servers.update(list => [
      ...list,
      {
        id, url, title: url, version: '2.0.0', status: 'loading',
        featureTypes: [], jsonOutputFormats: [],
      },
    ]);

    try {
      const parsed = await this.fetchCapabilities(url, '2.0.0', id);
      this.updateServer(id, { ...parsed, status: 'ready' });
    } catch {
      // Fallback to WFS 1.1.0
      try {
        const parsed = await this.fetchCapabilities(url, '1.1.0', id);
        this.updateServer(id, { ...parsed, status: 'ready' });
      } catch (err: any) {
        this.updateServer(id, {
          status: 'error',
          error: err?.message ?? 'Impossible de récupérer le GetCapabilities WFS',
        });
        throw err;
      }
    }
  }

  removeServer(serverId: string): void {
    this.activeLayers()
      .filter(l => l.serverId === serverId)
      .forEach(l => {
        this.cesiumWfsService.removeDataSource(l.featureTypeId);
      });

    this.activeLayers.update(list => list.filter(l => l.serverId !== serverId));
    this.servers.update(list => list.filter(s => s.id !== serverId));
  }

  // ─── Feature type activation ─────────────────────────────────────────────────

  async toggleFeatureType(server: WfsServer, ft: WfsFeatureType): Promise<void> {
    const isActive = this.isFeatureTypeActive(ft.id);

    if (isActive) {
      this.cesiumWfsService.removeDataSource(ft.id);
      this.activeLayers.update(list => list.filter(l => l.featureTypeId !== ft.id));
      return;
    }

    // Resolve GeoJSON output format
    const outputFormat = this.resolveJsonFormat(server, ft);
    if (!outputFormat) {
      throw new Error(
        `Le serveur ne supporte pas de format GeoJSON pour la couche "${ft.title}". ` +
        `Formats disponibles : ${ft.outputFormats.join(', ')}`
      );
    }

    const colorIndex = this.activeLayers().length % WFS_COLOR_PALETTE.length;
    const color = WFS_COLOR_PALETTE[colorIndex];

    const activeLayer: ActiveWfsLayer = {
      featureTypeId: ft.id,
      serverId: server.id,
      serverUrl: server.url,
      serverVersion: server.version,
      featureTypeName: ft.name,
      featureTypeTitle: ft.title,
      outputFormat,
      featureCount: 0,
      status: 'loading',
      style: { color, opacity: 0.85, strokeWidth: 2 },
      visible: true,
      boundingBox: ft.boundingBox,
    };

    this.activeLayers.update(list => [...list, activeLayer]);

    try {
      const geoJson = await this.fetchFeatures(server, ft, outputFormat);
      const count = (geoJson as any)?.features?.length ?? 0;

      this.updateActiveLayer(ft.id, { status: 'ready', featureCount: count });

      await this.cesiumWfsService.loadGeoJson(ft.id, geoJson, activeLayer.style, ft.boundingBox);
    } catch (err: any) {
      this.updateActiveLayer(ft.id, {
        status: 'error',
        error: err?.message ?? 'Erreur lors du chargement des entités',
      });
      throw err;
    }
  }

  isFeatureTypeActive(featureTypeId: string): boolean {
    return this.activeLayers().some(l => l.featureTypeId === featureTypeId);
  }

  getActiveLayer(featureTypeId: string): ActiveWfsLayer | undefined {
    return this.activeLayers().find(l => l.featureTypeId === featureTypeId);
  }

  setOpacity(featureTypeId: string, opacity: number): void {
    this.cesiumWfsService.setOpacity(featureTypeId, opacity);
    this.updateActiveLayer(featureTypeId, {
      style: { ...this.getActiveLayer(featureTypeId)!.style, opacity },
    });
  }

  setColor(featureTypeId: string, color: string): void {
    this.cesiumWfsService.setColor(featureTypeId, color);
    this.updateActiveLayer(featureTypeId, {
      style: { ...this.getActiveLayer(featureTypeId)!.style, color },
    });
  }

  setVisibility(featureTypeId: string, visible: boolean): void {
    this.cesiumWfsService.setVisibility(featureTypeId, visible);
    this.updateActiveLayer(featureTypeId, { visible });
  }

  zoomTo(featureTypeId: string): void {
    this.cesiumWfsService.zoomTo(featureTypeId);
  }

  // ─── GetCapabilities parsing ──────────────────────────────────────────────────

  private async fetchCapabilities(
    url: string,
    version: WfsVersion,
    serverId: string
  ): Promise<Partial<WfsServer>> {
    const capUrl = `${url}?SERVICE=WFS&VERSION=${version}&REQUEST=GetCapabilities`;
    const xmlText = await firstValueFrom(this.http.get(capUrl, { responseType: 'text' }));
    return this.parseCapabilities(xmlText, serverId, version);
  }

  private parseCapabilities(
    xmlText: string,
    serverId: string,
    hintVersion: WfsVersion
  ): Partial<WfsServer> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Réponse XML invalide du serveur WFS');
    }

    const root = doc.documentElement;
    const version = (root.getAttribute('version') ?? hintVersion) as WfsVersion;

    // Service title (OWS namespace for 2.0, Service element for 1.x)
    const title =
      doc.querySelector('ServiceIdentification > Title')?.textContent?.trim() ??
      doc.querySelector('Service > Title')?.textContent?.trim() ??
      'Serveur WFS';

    const abstract =
      doc.querySelector('ServiceIdentification > Abstract')?.textContent?.trim() ??
      doc.querySelector('Service > Abstract')?.textContent?.trim() ??
      '';

    // Server-level GeoJSON output formats from OperationsMetadata
    const jsonOutputFormats = this.parseServerJsonFormats(doc);

    // Feature types
    const featureTypes = Array.from(doc.querySelectorAll('FeatureTypeList > FeatureType'))
      .map(el => this.parseFeatureType(el, serverId, version, jsonOutputFormats));

    return { title, abstract, version, featureTypes, jsonOutputFormats };
  }

  private parseServerJsonFormats(doc: Document): string[] {
    // WFS 2.0: ows:Operation[@name='GetFeature'] > ows:Parameter[@name='outputFormat'] > ows:AllowedValues > ows:Value
    const values = Array.from(
      doc.querySelectorAll(
        'Operation[name="GetFeature"] Parameter[name="outputFormat"] Value, ' +
        'Operation[name="GetFeature"] Parameter[name="OutputFormat"] Value'
      )
    ).map(el => el.textContent?.trim() ?? '');

    // WFS 1.x: ResultFormat elements
    const legacyValues = Array.from(
      doc.querySelectorAll('GetFeature ResultFormat *')
    ).map(el => el.tagName);

    const all = [...values, ...legacyValues].filter(Boolean);
    return all.filter(f => JSON_FORMATS.some(j => f.toLowerCase().includes(j)));
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

    // CRS: WFS 2.0 = DefaultCRS, WFS 1.x = DefaultSRS
    const defaultCrs =
      el.querySelector('DefaultCRS')?.textContent?.trim() ??
      el.querySelector('DefaultSRS')?.textContent?.trim() ??
      'EPSG:4326';

    const otherCrs = [
      ...Array.from(el.querySelectorAll('OtherCRS')).map(e => e.textContent?.trim() ?? ''),
      ...Array.from(el.querySelectorAll('OtherSRS')).map(e => e.textContent?.trim() ?? ''),
    ].filter(Boolean);

    // Bounding box: WGS84BoundingBox (2.0) or LatLongBoundingBox (1.x)
    const boundingBox =
      this.parseWgs84BoundingBox(el) ?? this.parseLatLongBoundingBox(el);

    // Per-feature-type output formats (override or inherit server-level)
    const ftFormats = Array.from(el.querySelectorAll('OutputFormats Value'))
      .map(e => e.textContent?.trim() ?? '')
      .filter(f => JSON_FORMATS.some(j => f.toLowerCase().includes(j)));

    const outputFormats = ftFormats.length > 0 ? ftFormats : serverJsonFormats;

    return {
      id: `${serverId}::${name}`,
      name,
      title,
      abstract,
      defaultCrs,
      otherCrs,
      boundingBox,
      outputFormats,
    };
  }

  private parseWgs84BoundingBox(el: Element): WfsBoundingBox | undefined {
    const bbox = el.querySelector('WGS84BoundingBox');
    if (!bbox) return undefined;
    const lower = bbox.querySelector('LowerCorner')?.textContent?.trim().split(' ');
    const upper = bbox.querySelector('UpperCorner')?.textContent?.trim().split(' ');
    if (!lower || !upper || lower.length < 2 || upper.length < 2) return undefined;
    return {
      minX: parseFloat(lower[0]),
      minY: parseFloat(lower[1]),
      maxX: parseFloat(upper[0]),
      maxY: parseFloat(upper[1]),
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

  // ─── GetFeature ───────────────────────────────────────────────────────────────

  private async fetchFeatures(
    server: WfsServer,
    ft: WfsFeatureType,
    outputFormat: string
  ): Promise<object> {
    const url = this.buildGetFeatureUrl(server, ft, outputFormat);
    const response = await firstValueFrom(
      this.http.get<object>(url, { responseType: 'json' as const })
    );
    return response;
  }

  private buildGetFeatureUrl(
    server: WfsServer,
    ft: WfsFeatureType,
    outputFormat: string
  ): string {
    const base = server.url;
    const sep = base.includes('?') ? '&' : '?';
    const is2x = server.version === '2.0.0';

    const params = new URLSearchParams({
      SERVICE: 'WFS',
      VERSION: server.version,
      REQUEST: 'GetFeature',
      [is2x ? 'TYPENAMES' : 'TYPENAME']: ft.name,
      OUTPUTFORMAT: outputFormat,
      [is2x ? 'COUNT' : 'MAXFEATURES']: '2000',
      // Request WGS84 to ensure Cesium-compatible coordinates
      SRSNAME: is2x ? 'urn:ogc:def:crs:EPSG::4326' : 'EPSG:4326',
    });

    return `${base}${sep}${params.toString()}`;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
    this.servers.update(list =>
      list.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  private updateActiveLayer(featureTypeId: string, patch: Partial<ActiveWfsLayer>): void {
    this.activeLayers.update(list =>
      list.map(l => (l.featureTypeId === featureTypeId ? { ...l, ...patch } : l))
    );
  }
}
