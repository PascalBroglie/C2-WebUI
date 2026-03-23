import { OgcActiveLayer, OgcServer, OgcServerConfig } from './ogc.model';

// ─── WMTS-specific server connection config ───────────────────────────────────

export interface WmtsServerConfig extends OgcServerConfig {
  /** Preferred tile image format (e.g. 'image/png'). Defaults to 'image/png'. */
  preferredFormat?: string;
  /**
   * Preferred TileMatrixSet identifier.
   * When omitted the service auto-selects a Web Mercator or geographic set.
   */
  preferredTileMatrixSet?: string;
  /**
   * Request encoding to favour when both are available.
   * 'REST' uses URL templates from ResourceURL elements.
   * 'KVP'  uses key-value pair query strings.
   * Defaults to 'REST' when a ResourceURL is available, 'KVP' otherwise.
   */
  requestEncoding?: 'KVP' | 'REST';
}

// ─── Value objects ────────────────────────────────────────────────────────────

export interface WmtsBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WmtsStyle {
  identifier: string;
  title?: string;
  isDefault: boolean;
}

export interface WmtsTileMatrixSetLink {
  tileMatrixSet: string;
}

export interface WmtsResourceUrl {
  format: string;
  resourceType: 'tile' | 'FeatureInfo';
  /** URL template with {Style}, {TileMatrixSet}, {TileMatrix}, {TileRow}, {TileCol} placeholders. */
  template: string;
}

export interface WmtsLayer {
  /** Unique id: `<serverId>::<identifier>`. */
  id: string;
  identifier: string;
  title: string;
  abstract?: string;
  formats: string[];
  styles: WmtsStyle[];
  tileMatrixSetLinks: WmtsTileMatrixSetLink[];
  /** REST-style URL templates keyed by format. */
  resourceUrls: WmtsResourceUrl[];
  boundingBox?: WmtsBoundingBox;
}

/** Extends the shared OgcServer with WMTS-specific fields. */
export interface WmtsServer extends OgcServer {
  abstract?: string;
  version: '1.0.0';
  layers: WmtsLayer[];
}

/** Extends the shared OgcActiveLayer with WMTS rendering options. */
export interface ActiveWmtsLayer extends OgcActiveLayer {
  serverUrl: string;
  layerIdentifier: string;
  layerTitle: string;
  style: string;
  format: string;
  tileMatrixSetId: string;
  requestEncoding: 'KVP' | 'REST';
  /** REST URL template (set when requestEncoding is 'REST'). */
  urlTemplate?: string;
  boundingBox?: WmtsBoundingBox;
}

// ─── TileMatrixSet selection priorities ──────────────────────────────────────

/** Preferred TileMatrixSet identifiers, in priority order for Cesium (Web Mercator first). */
export const PREFERRED_TILE_MATRIX_SETS = [
  'GoogleMapsCompatible',
  'EPSG:3857',
  'WebMercatorQuad',
  'PM',
  'EPSG:4326',
  'WGS84',
];
