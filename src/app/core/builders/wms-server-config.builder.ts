import { OgcServerConfigBuilder } from './ogc-server-config.builder';
import { WmsServerConfig, WmsVersion } from '../models/wms.model';

/**
 * Fluent builder for WMS server connection configurations.
 *
 * @example
 * const config = new WmsServerConfigBuilder()
 *   .withUrl('https://geoservices.brgm.fr/geologie')
 *   .withPreferredVersion('1.3.0')
 *   .withPreferredCrs('EPSG:4326')
 *   .withPreferredFormat('image/png')
 *   .withTimeout(20_000)
 *   .build();
 */
export class WmsServerConfigBuilder extends OgcServerConfigBuilder<WmsServerConfig> {
  private _preferredVersion?: WmsVersion;
  private _preferredCrs = 'EPSG:4326';
  private _preferredFormat = 'image/png';

  /**
   * Preferred WMS protocol version.
   * The service will try this version first, then fall back to 1.1.1.
   * Defaults to '1.3.0'.
   */
  withPreferredVersion(version: WmsVersion): this {
    this._preferredVersion = version;
    return this;
  }

  /**
   * Preferred coordinate reference system for tile requests.
   * Defaults to 'EPSG:4326'.
   */
  withPreferredCrs(crs: string): this {
    this._preferredCrs = crs;
    return this;
  }

  /**
   * Preferred image MIME type for GetMap requests.
   * Defaults to 'image/png' (supports transparency).
   */
  withPreferredFormat(format: string): this {
    this._preferredFormat = format;
    return this;
  }

  build(): WmsServerConfig {
    this.validate();
    return {
      url: this._url.trim(),
      label: this._label,
      proxy: this._proxy,
      timeout: this._timeout,
      preferredVersion: this._preferredVersion ?? '1.3.0',
      preferredCrs: this._preferredCrs,
      preferredFormat: this._preferredFormat,
    };
  }
}
