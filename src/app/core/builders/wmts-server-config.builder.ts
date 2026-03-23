import { OgcServerConfigBuilder } from './ogc-server-config.builder';
import { WmtsServerConfig } from '../models/wmts.model';

/**
 * Fluent builder for WMTS server connection configurations.
 *
 * @example
 * const config = new WmtsServerConfigBuilder()
 *   .withUrl('https://data.geopf.fr/wmts')
 *   .withPreferredFormat('image/png')
 *   .withPreferredTileMatrixSet('PM')
 *   .withRequestEncoding('REST')
 *   .build();
 */
export class WmtsServerConfigBuilder extends OgcServerConfigBuilder<WmtsServerConfig> {
  private _preferredFormat = 'image/png';
  private _preferredTileMatrixSet?: string;
  private _requestEncoding?: 'KVP' | 'REST';

  /**
   * Preferred tile image format.
   * Defaults to 'image/png' (supports transparency).
   */
  withPreferredFormat(format: string): this {
    this._preferredFormat = format;
    return this;
  }

  /**
   * Preferred TileMatrixSet identifier (e.g. 'GoogleMapsCompatible', 'PM', 'EPSG:4326').
   * When omitted the service auto-selects using PREFERRED_TILE_MATRIX_SETS priority list.
   */
  withPreferredTileMatrixSet(tileMatrixSet: string): this {
    this._preferredTileMatrixSet = tileMatrixSet;
    return this;
  }

  /**
   * Preferred request encoding.
   * 'REST' uses ResourceURL templates — lower overhead, better caching.
   * 'KVP'  uses key-value pair query strings — maximum compatibility.
   * When omitted, REST is preferred when ResourceURL elements are available.
   */
  withRequestEncoding(encoding: 'KVP' | 'REST'): this {
    this._requestEncoding = encoding;
    return this;
  }

  build(): WmtsServerConfig {
    this.validate();
    return {
      url: this._url.trim(),
      label: this._label,
      proxy: this._proxy,
      timeout: this._timeout,
      preferredFormat: this._preferredFormat,
      preferredTileMatrixSet: this._preferredTileMatrixSet,
      requestEncoding: this._requestEncoding,
    };
  }
}
