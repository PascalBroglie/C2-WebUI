import { OgcServerConfig } from '../models/ogc.model';

/**
 * Abstract fluent builder for OGC server connection configurations.
 *
 * Subclasses extend this with service-specific options and implement `build()`.
 * The `this` return type preserves the concrete subclass type through the
 * entire fluent chain — no casting required.
 *
 * @example
 * const config = new WmsServerConfigBuilder()
 *   .withUrl('https://example.com/wms')
 *   .withProxy('/api/proxy')
 *   .withTimeout(15_000)
 *   .withPreferredCrs('EPSG:4326')
 *   .build();
 */
export abstract class OgcServerConfigBuilder<TConfig extends OgcServerConfig> {
  protected _url = '';
  protected _label?: string;
  protected _proxy?: string;
  protected _timeout = 30_000;

  withUrl(url: string): this {
    this._url = url;
    return this;
  }

  /** Optional display name that overrides the title from GetCapabilities. */
  withLabel(label: string): this {
    this._label = label;
    return this;
  }

  /**
   * Base URL of a reverse-proxy forwarding requests to the OGC endpoint.
   * Required when the target server does not expose CORS headers.
   */
  withProxy(proxyUrl: string): this {
    this._proxy = proxyUrl;
    return this;
  }

  /** HTTP request timeout in milliseconds (default: 30 000). */
  withTimeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  /** Validates mandatory fields and throws a descriptive error if invalid. */
  protected validate(): void {
    if (!this._url.trim()) {
      throw new Error(`${this.constructor.name}: URL is required`);
    }
    try {
      new URL(this._url.trim());
    } catch {
      throw new Error(`${this.constructor.name}: "${this._url}" is not a valid URL`);
    }
  }

  /** Produces the immutable configuration object. */
  abstract build(): TConfig;
}
