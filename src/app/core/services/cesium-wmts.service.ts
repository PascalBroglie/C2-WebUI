import { Injectable } from '@angular/core';
import * as Cesium from 'cesium';
import { CesiumDataAdapter } from '../models/ogc.model';
import { ActiveWmtsLayer } from '../models/wmts.model';

@Injectable({ providedIn: 'root' })
export class CesiumWmtsService implements CesiumDataAdapter {
  private viewer: Cesium.Viewer | null = null;
  private layerMap = new Map<string, Cesium.ImageryLayer>();

  setViewer(viewer: unknown): void {
    this.viewer = viewer as Cesium.Viewer;
  }

  addLayer(activeLayer: ActiveWmtsLayer): void {
    if (!this.viewer) return;

    const provider = this.buildProvider(activeLayer);
    const imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    imageryLayer.alpha = activeLayer.opacity;
    imageryLayer.show = activeLayer.visible;
    this.layerMap.set(activeLayer.layerId, imageryLayer);

    if (activeLayer.boundingBox) {
      const bb = activeLayer.boundingBox;
      this.viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(bb.minX, bb.minY, bb.maxX, bb.maxY),
      });
    }
  }

  removeLayer(layerId: string): void {
    const layer = this.layerMap.get(layerId);
    if (layer && this.viewer) {
      this.viewer.imageryLayers.remove(layer, true);
      this.layerMap.delete(layerId);
    }
  }

  setOpacity(layerId: string, opacity: number): void {
    const layer = this.layerMap.get(layerId);
    if (layer) layer.alpha = opacity;
  }

  setVisibility(layerId: string, visible: boolean): void {
    const layer = this.layerMap.get(layerId);
    if (layer) layer.show = visible;
  }

  zoomTo(layerId: string): void {
    const layer = this.layerMap.get(layerId);
    if (layer && this.viewer) {
      this.viewer.camera.flyTo({ destination: layer.imageryProvider.rectangle });
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildProvider(layer: ActiveWmtsLayer): Cesium.WebMapTileServiceImageryProvider {
    if (layer.requestEncoding === 'REST' && layer.urlTemplate) {
      // REST encoding: use the URL template directly.
      // Cesium uses {Style}, {TileMatrixSet}, {TileMatrix}, {TileRow}, {TileCol} placeholders.
      return new Cesium.WebMapTileServiceImageryProvider({
        url: layer.urlTemplate,
        layer: layer.layerIdentifier,
        style: layer.style,
        format: layer.format,
        tileMatrixSetID: layer.tileMatrixSetId,
      });
    }

    // KVP encoding: base URL + query parameters.
    return new Cesium.WebMapTileServiceImageryProvider({
      url: new Cesium.Resource({
        url: layer.serverUrl,
        queryParameters: {
          SERVICE: 'WMTS',
          VERSION: '1.0.0',
          REQUEST: 'GetTile',
        },
      }),
      layer: layer.layerIdentifier,
      style: layer.style,
      format: layer.format,
      tileMatrixSetID: layer.tileMatrixSetId,
    });
  }
}
