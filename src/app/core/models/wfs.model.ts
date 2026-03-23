export type WfsVersion = '1.0.0' | '1.1.0' | '2.0.0';
export type WfsServerStatus = 'idle' | 'loading' | 'ready' | 'error';
export type WfsLayerStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WfsBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface WfsFeatureType {
  /** Unique identifier within a server: `<serverId>::<name>` */
  id: string;
  /** Qualified name, e.g. `ms:communes` */
  name: string;
  title: string;
  abstract?: string;
  defaultCrs: string;
  otherCrs: string[];
  /** WGS84 bounding box extracted from capabilities */
  boundingBox?: WfsBoundingBox;
  /** Output formats supported by this feature type (subset of server formats) */
  outputFormats: string[];
}

export interface WfsServer {
  id: string;
  url: string;
  title: string;
  abstract?: string;
  version: WfsVersion;
  status: WfsServerStatus;
  error?: string;
  featureTypes: WfsFeatureType[];
  /** GeoJSON-compatible output formats advertised by the server */
  jsonOutputFormats: string[];
}

export interface WfsLayerStyle {
  color: string;
  opacity: number;
  strokeWidth: number;
}

export interface ActiveWfsLayer {
  featureTypeId: string;
  serverId: string;
  serverUrl: string;
  serverVersion: WfsVersion;
  featureTypeName: string;
  featureTypeTitle: string;
  outputFormat: string;
  featureCount: number;
  status: WfsLayerStatus;
  error?: string;
  style: WfsLayerStyle;
  visible: boolean;
  boundingBox?: WfsBoundingBox;
}

/** Ordered palette for auto-assigning colors to WFS layers */
export const WFS_COLOR_PALETTE = [
  '#1565C0', '#AD1457', '#2E7D32', '#E65100',
  '#6A1B9A', '#00838F', '#F57F17', '#37474F',
  '#880E4F', '#1B5E20', '#0D47A1', '#BF360C',
];
