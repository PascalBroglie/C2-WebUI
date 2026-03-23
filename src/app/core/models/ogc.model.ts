import { Signal } from '@angular/core';

// ─── Service type discriminant ────────────────────────────────────────────────

export type OgcServiceType = 'WMS' | 'WFS' | 'WMTS';

// ─── Shared server/layer value objects ───────────────────────────────────────

/** Minimal server descriptor common to WMS and WFS. */
export interface OgcServer {
  id: string;
  url: string;
  title: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

/** Minimal active-layer descriptor common to all OGC rendering layers. */
export interface OgcActiveLayer {
  /** Globally unique layer identifier used as key in Cesium services. */
  layerId: string;
  serverId: string;
  visible: boolean;
  opacity: number;
}

// ─── Server connection configuration ─────────────────────────────────────────

/** Base connection options produced by every OgcServerConfigBuilder. */
export interface OgcServerConfig {
  url: string;
  /** Human-readable label (overrides the title returned by GetCapabilities). */
  label?: string;
  /** Proxy base URL inserted between the browser and the OGC endpoint. */
  proxy?: string;
  /** HTTP request timeout in milliseconds. Default: 30 000. */
  timeout?: number;
}

// ─── Service interface ────────────────────────────────────────────────────────

/**
 * Common contract implemented by every OGC data service (WMS, WFS, …).
 * Consumed by LayerManagerComponent through OGC_SERVICES_TOKEN so it can
 * work uniformly across service types without coupling.
 */
export interface OgcService {
  /** Discriminant used for routing to type-specific UI. */
  readonly serviceType: OgcServiceType;
  /** Short label shown in tabs / badges (e.g. "WMS", "WFS"). */
  readonly label: string;
  /** Material icon name for the tab. */
  readonly icon: string;

  readonly servers: Signal<OgcServer[]>;
  readonly activeLayers: Signal<OgcActiveLayer[]>;

  addServer(config: OgcServerConfig): Promise<void>;
  removeServer(serverId: string): void;
}

// ─── Cesium adapter interface ─────────────────────────────────────────────────

/**
 * Uniform interface for all Cesium rendering adapters (imagery layers, data
 * sources, …).  CesiumViewerComponent initialises every registered adapter
 * via CESIUM_ADAPTERS_TOKEN, removing direct coupling to concrete classes.
 */
export interface CesiumDataAdapter {
  setViewer(viewer: unknown): void;
  removeLayer(layerId: string): void;
  setOpacity(layerId: string, opacity: number): void;
  setVisibility(layerId: string, visible: boolean): void;
  zoomTo(layerId: string): void;
}
