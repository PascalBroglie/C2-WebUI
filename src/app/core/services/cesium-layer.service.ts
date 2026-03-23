import { Injectable } from '@angular/core';
import * as Cesium from 'cesium';
import { ActiveWmsLayer } from '../models/wms.model';

@Injectable({ providedIn: 'root' })
export class CesiumLayerService {
  private viewer: Cesium.Viewer | null = null;
  private layerMap = new Map<string, Cesium.ImageryLayer>();

  setViewer(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
  }

  addLayer(activeLayer: ActiveWmsLayer): void {
    if (!this.viewer) return;

    const provider = new Cesium.WebMapServiceImageryProvider({
      url: activeLayer.serverUrl,
      layers: activeLayer.layerName,
      parameters: {
        transparent: true,
        format: 'image/png',
        version: activeLayer.serverVersion,
        ...(activeLayer.style ? { styles: activeLayer.style } : {}),
      },
    });

    const imageryLayer = this.viewer.imageryLayers.addImageryProvider(provider);
    imageryLayer.alpha = activeLayer.opacity;
    imageryLayer.show = activeLayer.visible;

    this.layerMap.set(activeLayer.layerId, imageryLayer);

    // Auto-zoom to layer extent if available
    if (activeLayer.geographicBoundingBox) {
      const bbox = activeLayer.geographicBoundingBox;
      const rectangle = Cesium.Rectangle.fromDegrees(
        bbox.minX,
        bbox.minY,
        bbox.maxX,
        bbox.maxY
      );
      this.viewer.camera.flyTo({ destination: rectangle });
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

  moveLayerUp(layerId: string): void {
    const layer = this.layerMap.get(layerId);
    if (layer && this.viewer) this.viewer.imageryLayers.raise(layer);
  }

  moveLayerDown(layerId: string): void {
    const layer = this.layerMap.get(layerId);
    if (layer && this.viewer) this.viewer.imageryLayers.lower(layer);
  }
}
