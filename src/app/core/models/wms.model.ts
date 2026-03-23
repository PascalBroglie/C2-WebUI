export type WmsVersion = '1.1.1' | '1.3.0';
export type WmsServerStatus = 'idle' | 'loading' | 'ready' | 'error';

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
  /** Unique identifier: `<serverId>::<name>` */
  id: string;
  /** WMS layer name used in requests (empty for group layers) */
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

export interface WmsServer {
  id: string;
  url: string;
  title: string;
  abstract?: string;
  version: WmsVersion;
  status: WmsServerStatus;
  error?: string;
  layers: WmsLayer[];
}

export interface ActiveWmsLayer {
  layerId: string;
  serverId: string;
  serverUrl: string;
  serverVersion: WmsVersion;
  layerName: string;
  layerTitle: string;
  opacity: number;
  visible: boolean;
  style: string;
  geographicBoundingBox?: WmsBoundingBox;
}
