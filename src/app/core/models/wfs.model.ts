import { OgcActiveLayer, OgcServer, OgcServerConfig } from './ogc.model';

export type WfsVersion = '1.0.0' | '1.1.0' | '2.0.0';
export type WfsServerStatus = 'idle' | 'loading' | 'ready' | 'error';
export type WfsLayerStatus = 'idle' | 'loading' | 'ready' | 'error';

// ─── WFS-specific server connection config ────────────────────────────────────

export interface WfsServerConfig extends OgcServerConfig {
  preferredVersion: WfsVersion;
  maxFeatures: number;
  srsName?: string;
  preferredOutputFormat?: string;
}

// ─── WFS server / feature type value objects ──────────────────────────────────

export interface WfsBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WfsFeatureType {
  /** Unique id: `<serverId>::<name>` — also used as layerId in ActiveWfsLayer. */
  id: string;
  name: string;
  title: string;
  abstract?: string;
  defaultCrs: string;
  otherCrs: string[];
  boundingBox?: WfsBoundingBox;
  outputFormats: string[];
}

export interface WfsLayerStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
}

/** Extends the shared OgcServer with WFS-specific fields. */
export interface WfsServer extends OgcServer {
  abstract?: string;
  version: WfsVersion;
  featureTypes: WfsFeatureType[];
  jsonOutputFormats: string[];
}

/** Extends the shared OgcActiveLayer with WFS rendering options. */
export interface ActiveWfsLayer extends OgcActiveLayer {
  serverUrl: string;
  serverVersion: WfsVersion;
  featureTypeName: string;
  featureTypeTitle: string;
  outputFormat: string;
  featureCount: number;
  loadStatus: WfsLayerStatus;
  error?: string;
  style: WfsLayerStyle;
  boundingBox?: WfsBoundingBox;
}

export const WFS_COLOR_PALETTE = [
  '#1565C0', '#AD1457', '#2E7D32', '#E65100',
  '#6A1B9A', '#00838F', '#F57F17', '#37474F',
  '#880E4F', '#1B5E20', '#0D47A1', '#BF360C',
];
