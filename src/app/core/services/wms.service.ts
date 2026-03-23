import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ActiveWmsLayer,
  WmsBoundingBox,
  WmsLayer,
  WmsServer,
  WmsServerStatus,
  WmsStyle,
  WmsVersion,
} from '../models/wms.model';
import { CesiumLayerService } from './cesium-layer.service';

@Injectable({ providedIn: 'root' })
export class WmsService {
  private http = inject(HttpClient);
  private cesiumLayerService = inject(CesiumLayerService);

  readonly servers = signal<WmsServer[]>([]);
  readonly activeLayers = signal<ActiveWmsLayer[]>([]);

  // ─── Server management ───────────────────────────────────────────────────────

  async addServer(rawUrl: string): Promise<void> {
    const url = this.normalizeUrl(rawUrl);
    const id = crypto.randomUUID();

    this.servers.update(list => [
      ...list,
      { id, url, title: url, version: '1.3.0', status: 'loading', layers: [] },
    ]);

    try {
      const capUrl = this.buildGetCapabilitiesUrl(url, '1.3.0');
      const xmlText = await firstValueFrom(
        this.http.get(capUrl, { responseType: 'text' })
      );
      const parsed = this.parseCapabilities(xmlText, id);
      this.updateServer(id, { ...parsed, status: 'ready' });
    } catch (err: any) {
      // Fallback: try WMS 1.1.1 if 1.3.0 failed
      try {
        const capUrl = this.buildGetCapabilitiesUrl(url, '1.1.1');
        const xmlText = await firstValueFrom(
          this.http.get(capUrl, { responseType: 'text' })
        );
        const parsed = this.parseCapabilities(xmlText, id);
        this.updateServer(id, { ...parsed, status: 'ready' });
      } catch (err2: any) {
        this.updateServer(id, {
          status: 'error',
          error: err2?.message ?? 'Impossible de récupérer le GetCapabilities',
        });
        throw err2;
      }
    }
  }

  removeServer(serverId: string): void {
    // Clean up all active layers belonging to this server
    this.activeLayers()
      .filter(l => l.serverId === serverId)
      .forEach(l => this.cesiumLayerService.removeLayer(l.layerId));

    this.activeLayers.update(list => list.filter(l => l.serverId !== serverId));
    this.servers.update(list => list.filter(s => s.id !== serverId));
  }

  // ─── Layer activation ────────────────────────────────────────────────────────

  toggleLayer(server: WmsServer, layer: WmsLayer): void {
    if (!layer.name) return; // Group layers cannot be activated

    const alreadyActive = this.isLayerActive(layer.id);

    if (alreadyActive) {
      this.cesiumLayerService.removeLayer(layer.id);
      this.activeLayers.update(list => list.filter(l => l.layerId !== layer.id));
    } else {
      const activeLayer: ActiveWmsLayer = {
        layerId: layer.id,
        serverId: server.id,
        serverUrl: server.url,
        serverVersion: server.version,
        layerName: layer.name,
        layerTitle: layer.title,
        opacity: 1,
        visible: true,
        style: layer.styles[0]?.name ?? '',
        geographicBoundingBox: layer.geographicBoundingBox,
      };
      this.cesiumLayerService.addLayer(activeLayer);
      this.activeLayers.update(list => [...list, activeLayer]);
    }
  }

  isLayerActive(layerId: string): boolean {
    return this.activeLayers().some(l => l.layerId === layerId);
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    this.cesiumLayerService.setOpacity(layerId, opacity);
    this.activeLayers.update(list =>
      list.map(l => (l.layerId === layerId ? { ...l, opacity } : l))
    );
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.cesiumLayerService.setVisibility(layerId, visible);
    this.activeLayers.update(list =>
      list.map(l => (l.layerId === layerId ? { ...l, visible } : l))
    );
  }

  getActiveLayer(layerId: string): ActiveWmsLayer | undefined {
    return this.activeLayers().find(l => l.layerId === layerId);
  }

  // ─── URL helpers ─────────────────────────────────────────────────────────────

  private normalizeUrl(raw: string): string {
    try {
      const u = new URL(raw.trim());
      // Strip query parameters — GetCapabilities will add its own
      return `${u.origin}${u.pathname}`;
    } catch {
      return raw.trim();
    }
  }

  private buildGetCapabilitiesUrl(baseUrl: string, version: WmsVersion): string {
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}SERVICE=WMS&VERSION=${version}&REQUEST=GetCapabilities`;
  }

  private updateServer(id: string, patch: Partial<WmsServer>): void {
    this.servers.update(list =>
      list.map(s => (s.id === id ? { ...s, ...patch } : s))
    );
  }

  // ─── GetCapabilities XML parsing ─────────────────────────────────────────────

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

    const title =
      doc.querySelector('Service > Title')?.textContent?.trim() ?? 'Serveur WMS';
    const abstract =
      doc.querySelector('Service > Abstract')?.textContent?.trim() ?? '';

    const rootLayerEl = doc.querySelector('Capability > Layer');
    const layers = rootLayerEl
      ? this.parseChildLayers(rootLayerEl, serverId, [], version)
      : [];

    return { title, abstract, version, layers };
  }

  private parseChildLayers(
    parentEl: Element,
    serverId: string,
    inheritedCrs: string[],
    version: WmsVersion
  ): WmsLayer[] {
    return Array.from(parentEl.children)
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
    const title =
      el.querySelector(':scope > Title')?.textContent?.trim() ?? '(sans titre)';
    const abstract = el.querySelector(':scope > Abstract')?.textContent?.trim();
    const queryable = el.getAttribute('queryable') === '1';
    const opaque = el.getAttribute('opaque') === '1';

    // CRS / SRS (inherited + own)
    const crsTag = version === '1.3.0' ? 'CRS' : 'SRS';
    const ownCrs = Array.from(el.querySelectorAll(`:scope > ${crsTag}`))
      .map(e => e.textContent?.trim() ?? '')
      .filter(Boolean);
    const crs = [...new Set([...inheritedCrs, ...ownCrs])];

    // Geographic bounding box (WMS 1.3.0 = EX_GeographicBoundingBox, 1.1.1 = LatLonBoundingBox)
    const geographicBoundingBox =
      this.parseExGeographicBbox(el) ?? this.parseLatLonBbox(el);

    // Styles
    const styles: WmsStyle[] = Array.from(
      el.querySelectorAll(':scope > Style')
    ).map(styleEl => ({
      name: styleEl.querySelector('Name')?.textContent?.trim() ?? '',
      title: styleEl.querySelector('Title')?.textContent?.trim() ?? '',
      legendUrl:
        styleEl
          .querySelector('LegendURL OnlineResource')
          ?.getAttribute('xlink:href') ?? undefined,
    }));

    const children = this.parseChildLayers(el, serverId, crs, version);

    return {
      id: name
        ? `${serverId}::${name}`
        : `${serverId}::group::${crypto.randomUUID()}`,
      name,
      title,
      abstract,
      crs,
      geographicBoundingBox,
      styles,
      children,
      queryable,
      opaque,
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
}
