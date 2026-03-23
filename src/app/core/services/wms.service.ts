import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OgcActiveLayer, OgcServer, OgcServerConfig, OgcService, OgcServiceType } from '../models/ogc.model';
import {
  ActiveWmsLayer,
  WmsBoundingBox,
  WmsLayer,
  WmsServer,
  WmsServerConfig,
  WmsStyle,
  WmsVersion,
} from '../models/wms.model';
import { CesiumLayerService } from './cesium-layer.service';
import { PersistenceService } from './persistence.service';

@Injectable({ providedIn: 'root' })
export class WmsService implements OgcService {
  private http = inject(HttpClient);
  private cesiumLayerService = inject(CesiumLayerService);
  private persistence = inject(PersistenceService);

  // ─── OgcService identity ──────────────────────────────────────────────────

  readonly serviceType: OgcServiceType = 'WMS';
  readonly label = 'WMS';
  readonly icon = 'map';

  // ─── OgcService state ─────────────────────────────────────────────────────

  readonly servers = signal<WmsServer[]>([]);
  readonly activeLayers = signal<ActiveWmsLayer[]>([]);

  /** Maps serverId → original config for persistence. */
  private readonly configMap = new Map<string, WmsServerConfig>();

  constructor() {
    // Restore previously saved servers on startup.
    const saved = this.persistence.load<WmsServerConfig>('wms.servers');
    saved.forEach(config => this.addServer(config).catch(() => {}));
  }

  // ─── OgcService contract ──────────────────────────────────────────────────

  /**
   * Adds a WMS server by fetching its GetCapabilities document.
   * Accepts OgcServerConfig (interface) and narrows to WmsServerConfig internally.
   * Type safety is guaranteed upstream by WmsServerConfigBuilder.
   */
  async addServer(rawConfig: OgcServerConfig): Promise<void> {
    const config = rawConfig as WmsServerConfig;
    const url = this.normalizeUrl(config.url);
    const id = crypto.randomUUID();

    this.servers.update(list => [
      ...list,
      { id, url, title: config.label ?? url, version: '1.3.0', status: 'loading', layers: [] },
    ]);

    const versionsToTry: WmsVersion[] = [
      config.preferredVersion ?? '1.3.0',
      config.preferredVersion === '1.1.1' ? '1.3.0' : '1.1.1',
    ];

    for (const version of versionsToTry) {
      try {
        const capUrl = this.buildCapabilitiesUrl(url, version);
        const xmlText = await firstValueFrom(this.http.get(capUrl, { responseType: 'text' }));
        const parsed = this.parseCapabilities(xmlText, id);
        this.updateServer(id, { ...parsed, status: 'ready' });
        this.configMap.set(id, config);
        this.persistConfigs();
        return;
      } catch {
        // try next version
      }
    }

    this.updateServer(id, {
      status: 'error',
      error: 'Impossible de récupérer le GetCapabilities (WMS 1.3.0 et 1.1.1)',
    });
    throw new Error('WMS GetCapabilities failed');
  }

  removeServer(serverId: string): void {
    this.activeLayers()
      .filter(l => l.serverId === serverId)
      .forEach(l => this.cesiumLayerService.removeLayer(l.layerId));

    this.activeLayers.update(list => list.filter(l => l.serverId !== serverId));
    this.servers.update(list => list.filter(s => s.id !== serverId));
    this.configMap.delete(serverId);
    this.persistConfigs();
  }

  // ─── Layer activation ─────────────────────────────────────────────────────

  toggleLayer(server: WmsServer, layer: WmsLayer): void {
    if (!layer.name) return;

    if (this.isLayerActive(layer.id)) {
      this.cesiumLayerService.removeLayer(layer.id);
      this.activeLayers.update(list => list.filter(l => l.layerId !== layer.id));
    } else {
      const active: ActiveWmsLayer = {
        layerId: layer.id,
        serverId: server.id,
        serverUrl: server.url,
        serverVersion: server.version,
        layerName: layer.name,
        layerTitle: layer.title,
        queryable: layer.queryable,
        opacity: 1,
        visible: true,
        style: layer.styles[0]?.name ?? '',
        geographicBoundingBox: layer.geographicBoundingBox,
      };
      this.cesiumLayerService.addLayer(active);
      this.activeLayers.update(list => [...list, active]);
    }
  }

  isLayerActive(layerId: string): boolean {
    return this.activeLayers().some(l => l.layerId === layerId);
  }

  getActiveLayer(layerId: string): ActiveWmsLayer | undefined {
    return this.activeLayers().find(l => l.layerId === layerId);
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    this.cesiumLayerService.setOpacity(layerId, opacity);
    this.updateActiveLayer(layerId, { opacity });
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.cesiumLayerService.setVisibility(layerId, visible);
    this.updateActiveLayer(layerId, { visible });
  }

  // ─── GetCapabilities parsing ──────────────────────────────────────────────

  private parseCapabilities(
    xmlText: string,
    serverId: string
  ): Pick<WmsServer, 'title' | 'abstract' | 'version' | 'layers'> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Réponse XML invalide du serveur WMS');
    }

    const root = doc.documentElement;
    const version = (root.getAttribute('version') ?? '1.3.0') as WmsVersion;
    const title = doc.querySelector('Service > Title')?.textContent?.trim() ?? 'Serveur WMS';
    const abstract = doc.querySelector('Service > Abstract')?.textContent?.trim() ?? '';

    const rootLayerEl = doc.querySelector('Capability > Layer');
    const layers = rootLayerEl ? this.parseChildLayers(rootLayerEl, serverId, [], version) : [];

    return { title, abstract, version, layers };
  }

  private parseChildLayers(
    parent: Element,
    serverId: string,
    inheritedCrs: string[],
    version: WmsVersion
  ): WmsLayer[] {
    return Array.from(parent.children)
      .filter(el => el.tagName === 'Layer')
      .map(el => this.parseLayer(el, serverId, inheritedCrs, version));
  }

  private parseLayer(
    el: Element,
    serverId: string,
    inheritedCrs: string[],
    version: WmsVersion
  ): WmsLayer {
    const name = el.querySelector(':scope > Name')?.textContent?.trim() ?? '';
    const title = el.querySelector(':scope > Title')?.textContent?.trim() ?? '(sans titre)';
    const abstract = el.querySelector(':scope > Abstract')?.textContent?.trim();
    const queryable = el.getAttribute('queryable') === '1';
    const opaque = el.getAttribute('opaque') === '1';

    const crsTag = version === '1.3.0' ? 'CRS' : 'SRS';
    const ownCrs = Array.from(el.querySelectorAll(`:scope > ${crsTag}`))
      .map(e => e.textContent?.trim() ?? '')
      .filter(Boolean);
    const crs = [...new Set([...inheritedCrs, ...ownCrs])];

    const geographicBoundingBox =
      this.parseExGeographicBbox(el) ?? this.parseLatLonBbox(el);

    const styles: WmsStyle[] = Array.from(el.querySelectorAll(':scope > Style')).map(s => ({
      name: s.querySelector('Name')?.textContent?.trim() ?? '',
      title: s.querySelector('Title')?.textContent?.trim() ?? '',
      legendUrl: s.querySelector('LegendURL OnlineResource')?.getAttribute('xlink:href') ?? undefined,
    }));

    const children = this.parseChildLayers(el, serverId, crs, version);

    return {
      id: name ? `${serverId}::${name}` : `${serverId}::group::${crypto.randomUUID()}`,
      name, title, abstract, crs, geographicBoundingBox, styles, children, queryable, opaque,
    };
  }

  private parseExGeographicBbox(el: Element): WmsBoundingBox | undefined {
    const bbox = el.querySelector(':scope > EX_GeographicBoundingBox');
    if (!bbox) return undefined;
    return {
      crs: 'CRS:84',
      minX: parseFloat(bbox.querySelector('westBoundLongitude')?.textContent ?? '0'),
      minY: parseFloat(bbox.querySelector('southBoundLatitude')?.textContent ?? '0'),
      maxX: parseFloat(bbox.querySelector('eastBoundLongitude')?.textContent ?? '0'),
      maxY: parseFloat(bbox.querySelector('northBoundLatitude')?.textContent ?? '0'),
    };
  }

  private parseLatLonBbox(el: Element): WmsBoundingBox | undefined {
    const bbox = el.querySelector(':scope > LatLonBoundingBox');
    if (!bbox) return undefined;
    return {
      crs: 'CRS:84',
      minX: parseFloat(bbox.getAttribute('minx') ?? '0'),
      minY: parseFloat(bbox.getAttribute('miny') ?? '0'),
      maxX: parseFloat(bbox.getAttribute('maxx') ?? '0'),
      maxY: parseFloat(bbox.getAttribute('maxy') ?? '0'),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private normalizeUrl(raw: string): string {
    try {
      const u = new URL(raw.trim());
      return `${u.origin}${u.pathname}`;
    } catch {
      return raw.trim();
    }
  }

  private buildCapabilitiesUrl(baseUrl: string, version: WmsVersion): string {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}SERVICE=WMS&VERSION=${version}&REQUEST=GetCapabilities`;
  }

  private persistConfigs(): void {
    this.persistence.save('wms.servers', Array.from(this.configMap.values()));
  }

  private updateServer(id: string, patch: Partial<WmsServer>): void {
    this.servers.update(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  private updateActiveLayer(layerId: string, patch: Partial<ActiveWmsLayer>): void {
    this.activeLayers.update(list =>
      list.map(l => (l.layerId === layerId ? { ...l, ...patch } : l))
    );
  }
}
