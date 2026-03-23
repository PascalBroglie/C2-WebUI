import { Injectable, signal } from '@angular/core';
import * as Cesium from 'cesium';
import { TerrainProviderConfig } from '../models/terrain.model';

@Injectable({ providedIn: 'root' })
export class TerrainService {
  private viewer: Cesium.Viewer | null = null;

  activeTerrainConfig = signal<TerrainProviderConfig | null>(null);

  setViewer(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
  }

  /**
   * Connects to a quantized-mesh terrain service using CesiumTerrainProvider.
   * The server must expose tiles in the quantized-mesh format with a layer.json descriptor.
   */
  async applyTerrain(config: TerrainProviderConfig): Promise<void> {
    if (!this.viewer) {
      throw new Error('Viewer not initialized');
    }

    const terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
      config.url,
      {
        requestVertexNormals: config.requestVertexNormals ?? true,
        requestWaterMask: config.requestWaterMask ?? false,
      }
    );

    this.viewer.terrainProvider = terrainProvider;
    this.activeTerrainConfig.set(config);
  }

  removeTerrain(): void {
    if (!this.viewer) return;
    this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
    this.activeTerrainConfig.set(null);
  }
}
