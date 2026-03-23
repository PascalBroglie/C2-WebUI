import { OgcActiveLayer, OgcServer, OgcServerConfig } from './ogc.model';

export type WmsVersion = '1.1.1' | '1.3.0';
export type WmsServerStatus = 'idle' | 'loading' | 'ready' | 'error';

// ─── WMS-specific server connection config ────────────────────────────────────

export interface WmsServerConfig extends OgcServerConfig {
  preferredVersion: WmsVersion;
  preferredCrs: string;
  preferredFormat: string;
}

// ─── WMS server / layer value objects ────────────────────────────────────────

export interface WmsStyle {
  name: string;
  title: string;
  legendUrl?: string;
}

export interface WmsBoundingBox {
  crs: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WmsLayer {
  id: string;
  name: string;
  title: string;
  abstract?: string;
  crs: string[];
  geographicBoundingBox?: WmsBoundingBox;
  styles: WmsStyle[];
  children: WmsLayer[];
  queryable: boolean;
  opaque: boolean;
}

/** Extends the shared OgcServer with WMS-specific fields. */
export interface WmsServer extends OgcServer {
  abstract?: string;
  version: WmsVersion;
  layers: WmsLayer[];
}

/** Extends the shared OgcActiveLayer with WMS rendering options. */
export interface ActiveWmsLayer extends OgcActiveLayer {
  serverUrl: string;
  serverVersion: WmsVersion;
  layerName: string;
  layerTitle: string;
  style: string;
  geographicBoundingBox?: WmsBoundingBox;
}

export const DEFAULT_TERRAIN_PROVIDERS = []; // kept for backwards compat
