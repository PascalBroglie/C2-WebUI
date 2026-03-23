import { OgcServerConfigBuilder } from './ogc-server-config.builder';
import { WfsServerConfig, WfsVersion } from '../models/wfs.model';

/**
 * Fluent builder for WFS server connection configurations.
 *
 * @example
 * const config = new WfsServerConfigBuilder()
 *   .withUrl('https://data.geopf.fr/wfs/ows')
 *   .withPreferredVersion('2.0.0')
 *   .withMaxFeatures(500)
 *   .withSrsName('urn:ogc:def:crs:EPSG::4326')
 *   .build();
 */
export class WfsServerConfigBuilder extends OgcServerConfigBuilder<WfsServerConfig> {
  private _preferredVersion?: WfsVersion;
  private _maxFeatures = 2_000;
  private _srsName?: string;
  private _preferredOutputFormat?: string;

  /**
   * Preferred WFS protocol version.
   * The service will try this version first, then fall back to 1.1.0.
   * Defaults to '2.0.0'.
   */
  withPreferredVersion(version: WfsVersion): this {
    this._preferredVersion = version;
    return this;
  }

  /**
   * Maximum number of features returned by a single GetFeature request.
   * Maps to COUNT (WFS 2.x) or MAXFEATURES (WFS 1.x).
   * Defaults to 2 000.
   */
  withMaxFeatures(n: number): this {
    this._maxFeatures = n;
    return this;
  }

  /**
   * Spatial reference system name included in GetFeature requests.
   * Defaults to the WGS84 URN appropriate for the negotiated version.
   */
  withSrsName(srsName: string): this {
    this._srsName = srsName;
    return this;
  }

  /**
   * Preferred GeoJSON output format identifier (e.g. 'application/json').
   * When omitted the service auto-selects from the server's advertised formats.
   */
  withPreferredOutputFormat(format: string): this {
    this._preferredOutputFormat = format;
    return this;
  }

  build(): WfsServerConfig {
    this.validate();
    return {
      url: this._url.trim(),
      label: this._label,
      proxy: this._proxy,
      timeout: this._timeout,
      preferredVersion: this._preferredVersion ?? '2.0.0',
      maxFeatures: this._maxFeatures,
      srsName: this._srsName,
      preferredOutputFormat: this._preferredOutputFormat,
    };
  }
}
