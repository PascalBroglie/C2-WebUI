import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PersistenceService } from './persistence.service';
import { OgcServerConfig, OgcService, OgcServiceType } from '../models/ogc.model';
import {
  ActiveWmtsLayer,
  PREFERRED_TILE_MATRIX_SETS,
  WmtsBoundingBox,
  WmtsLayer,
  WmtsResourceUrl,
  WmtsServer,
  WmtsServerConfig,
  WmtsStyle,
  WmtsTileMatrixSetLink,
} from '../models/wmts.model';
import { CesiumWmtsService } from './cesium-wmts.service';

@Injectable({ providedIn: 'root' })
export class WmtsService implements OgcService {
  private http = inject(HttpClient);
  private cesiumWmtsService = inject(CesiumWmtsService);
  private persistence = inject(PersistenceService);

  // ─── OgcService identity ──────────────────────────────────────────────────

  readonly serviceType: OgcServiceType = 'WMTS';
  readonly label = 'WMTS';
  readonly icon = 'grid_view';

  // ─── OgcService state ─────────────────────────────────────────────────────

  readonly servers = signal<WmtsServer[]>([]);
  readonly activeLayers = signal<ActiveWmtsLayer[]>([]);

  private readonly configMap = new Map<string, WmtsServerConfig>();

  constructor() {
    const saved = this.persistence.load<WmtsServerConfig>('wmts.servers');
    saved.forEach(config => this.addServer(config).catch(() => {}));
  }

  // ─── OgcService contract ──────────────────────────────────────────────────

  /**
   * Adds a WMTS server by fetching its GetCapabilities document.
   * Accepts OgcServerConfig (interface) and narrows to WmtsServerConfig internally.
   * Type safety is guaranteed upstream by WmtsServerConfigBuilder.
   */
  async addServer(rawConfig: OgcServerConfig): Promise<void> {
    const config = rawConfig as WmtsServerConfig;
    const url = this.normalizeUrl(config.url);
    const id = crypto.randomUUID();

    this.servers.update(list => [
      ...list,
      { id, url, title: config.label ?? url, version: '1.0.0', status: 'loading', layers: [] },
    ]);

    try {
      const capUrl = `${url}?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities`;
      const xmlText = await firstValueFrom(this.http.get(capUrl, { responseType: 'text' }));
      const parsed = this.parseCapabilities(xmlText, id);
      this.updateServer(id, { ...parsed, status: 'ready' });
      this.configMap.set(id, config);
      this.persistConfigs();
    } catch (err: any) {
      this.updateServer(id, {
        status: 'error',
        error: err?.message ?? 'Impossible de récupérer le GetCapabilities WMTS',
      });
      throw err;
    }
  }

  removeServer(serverId: string): void {
    this.activeLayers()
      .filter(l => l.serverId === serverId)
      .forEach(l => this.cesiumWmtsService.removeLayer(l.layerId));

    this.activeLayers.update(list => list.filter(l => l.serverId !== serverId));
    this.servers.update(list => list.filter(s => s.id !== serverId));
    this.configMap.delete(serverId);
    this.persistConfigs();
  }

  // ─── Layer activation ─────────────────────────────────────────────────────

  toggleLayer(server: WmtsServer, layer: WmtsLayer, config?: WmtsServerConfig): void {
    if (this.isLayerActive(layer.id)) {
      this.cesiumWmtsService.removeLayer(layer.id);
      this.activeLayers.update(list => list.filter(l => l.layerId !== layer.id));
      return;
    }

    const preferredTms = config?.preferredTileMatrixSet;
    const preferredFormat = config?.preferredFormat ?? 'image/png';
    const preferredEncoding = config?.requestEncoding;

    const tileMatrixSetId = this.resolveTileMatrixSet(layer, preferredTms);
    const format = this.resolveFormat(layer, preferredFormat);
    const defaultStyle = layer.styles.find(s => s.isDefault)?.identifier
      ?? layer.styles[0]?.identifier ?? 'default';

    // Resolve encoding and URL template
    const restUrl = layer.resourceUrls.find(r => r.resourceType === 'tile' && r.format === format)
      ?? layer.resourceUrls.find(r => r.resourceType === 'tile');
    const requestEncoding = preferredEncoding
      ?? (restUrl ? 'REST' : 'KVP');

    const activeLayer: ActiveWmtsLayer = {
      layerId: layer.id,
      serverId: server.id,
      serverUrl: server.url,
      layerIdentifier: layer.identifier,
      layerTitle: layer.title,
      style: defaultStyle,
      format,
      tileMatrixSetId,
      requestEncoding,
      urlTemplate: requestEncoding === 'REST' ? restUrl?.template : undefined,
      opacity: 1,
      visible: true,
      boundingBox: layer.boundingBox,
    };

    this.cesiumWmtsService.addLayer(activeLayer);
    this.activeLayers.update(list => [...list, activeLayer]);
  }

  isLayerActive(layerId: string): boolean {
    return this.activeLayers().some(l => l.layerId === layerId);
  }

  getActiveLayer(layerId: string): ActiveWmtsLayer | undefined {
    return this.activeLayers().find(l => l.layerId === layerId);
  }

  setLayerOpacity(layerId: string, opacity: number): void {
    this.cesiumWmtsService.setOpacity(layerId, opacity);
    this.updateActiveLayer(layerId, { opacity });
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    this.cesiumWmtsService.setVisibility(layerId, visible);
    this.updateActiveLayer(layerId, { visible });
  }

  zoomTo(layerId: string): void {
    this.cesiumWmtsService.zoomTo(layerId);
  }

  // ─── GetCapabilities XML parsing ──────────────────────────────────────────
  //
  // WMTS uses OWS namespace extensively (ows:Title, ows:Identifier, …).
  // DOMParser preserves namespace prefixes in tagName but querySelector
  // matches on local names. We use getElementsByTagNameNS('*', localName)
  // as the most robust cross-browser approach.

  private parseCapabilities(
    xmlText: string,
    serverId: string
  ): Pick<WmtsServer, 'title' | 'abstract' | 'layers'> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('Réponse XML invalide du serveur WMTS');
    }

    const title = this.text(doc, 'ServiceIdentification', 'Title') ?? 'Serveur WMTS';
    const abstract = this.text(doc, 'ServiceIdentification', 'Abstract') ?? '';

    const layerEls = Array.from(
      doc.getElementsByTagNameNS('*', 'Contents')[0]
        ?.childNodes ?? []
    ).filter(
      n => n.nodeType === Node.ELEMENT_NODE && (n as Element).localName === 'Layer'
    ) as Element[];

    const layers = layerEls.map(el => this.parseLayer(el, serverId));

    return { title, abstract, layers };
  }

  private parseLayer(el: Element, serverId: string): WmtsLayer {
    const identifier = this.textIn(el, 'Identifier') ?? '';
    const title = this.textIn(el, 'Title') ?? identifier;
    const abstract = this.textIn(el, 'Abstract');

    const formats = Array.from(el.getElementsByTagNameNS('*', 'Format'))
      .filter(f => f.parentElement?.localName === 'Layer' || f.closest?.('Layer') === el)
      .map(f => f.textContent?.trim() ?? '')
      .filter(Boolean);

    const styles: WmtsStyle[] = Array.from(el.getElementsByTagNameNS('*', 'Style'))
      .map(s => ({
        identifier: this.textIn(s, 'Identifier') ?? '',
        title: this.textIn(s, 'Title'),
        isDefault: s.getAttribute('isDefault') === 'true',
      }));

    const tileMatrixSetLinks: WmtsTileMatrixSetLink[] = Array.from(
      el.getElementsByTagNameNS('*', 'TileMatrixSetLink')
    ).map(link => ({
      tileMatrixSet: this.textIn(link, 'TileMatrixSet') ?? '',
    }));

    const resourceUrls: WmtsResourceUrl[] = Array.from(
      el.getElementsByTagNameNS('*', 'ResourceURL')
    ).map(r => ({
      format: r.getAttribute('format') ?? '',
      resourceType: (r.getAttribute('resourceType') ?? 'tile') as 'tile' | 'FeatureInfo',
      template: r.getAttribute('template') ?? '',
    })).filter(r => r.template);

    const boundingBox = this.parseBoundingBox(el);

    return {
      id: `${serverId}::${identifier}`,
      identifier,
      title,
      abstract,
      formats,
      styles,
      tileMatrixSetLinks,
      resourceUrls,
      boundingBox,
    };
  }

  private parseBoundingBox(el: Element): WmtsBoundingBox | undefined {
    const bbox = el.getElementsByTagNameNS('*', 'WGS84BoundingBox')[0];
    if (!bbox) return undefined;
    const lower = this.textIn(bbox, 'LowerCorner')?.split(' ');
    const upper = this.textIn(bbox, 'UpperCorner')?.split(' ');
    if (!lower || !upper || lower.length < 2 || upper.length < 2) return undefined;
    return {
      minX: parseFloat(lower[0]), minY: parseFloat(lower[1]),
      maxX: parseFloat(upper[0]), maxY: parseFloat(upper[1]),
    };
  }

  // ─── Resolution helpers ───────────────────────────────────────────────────

  private resolveTileMatrixSet(layer: WmtsLayer, preferred?: string): string {
    const available = layer.tileMatrixSetLinks.map(l => l.tileMatrixSet);
    if (preferred && available.includes(preferred)) return preferred;
    for (const candidate of PREFERRED_TILE_MATRIX_SETS) {
      if (available.includes(candidate)) return candidate;
    }
    return available[0] ?? 'GoogleMapsCompatible';
  }

  private resolveFormat(layer: WmtsLayer, preferred: string): string {
    if (layer.formats.includes(preferred)) return preferred;
    if (layer.formats.includes('image/png')) return 'image/png';
    return layer.formats[0] ?? 'image/png';
  }

  // ─── XML helpers (namespace-agnostic) ────────────────────────────────────

  /** Gets textContent of the first descendant with the given local names (path). */
  private text(root: Document, ...localNames: string[]): string | undefined {
    let current: Element | Document = root;
    for (const name of localNames) {
      const found: Element | undefined =
        (current as Document | Element).getElementsByTagNameNS('*', name)[0]
        ?? (current as Element).querySelector?.(name) ?? undefined;
      if (!found) return undefined;
      current = found;
    }
    return (current as Element).textContent?.trim() || undefined;
  }

  private textIn(el: Element | Document, localName: string): string | undefined {
    const found = (el as any).getElementsByTagNameNS('*', localName)[0];
    return found?.textContent?.trim() || undefined;
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

  private persistConfigs(): void {
    this.persistence.save('wmts.servers', Array.from(this.configMap.values()));
  }

  private updateServer(id: string, patch: Partial<WmtsServer>): void {
    this.servers.update(list => list.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  private updateActiveLayer(layerId: string, patch: Partial<ActiveWmtsLayer>): void {
    this.activeLayers.update(list =>
      list.map(l => (l.layerId === layerId ? { ...l, ...patch } : l))
    );
  }
}
