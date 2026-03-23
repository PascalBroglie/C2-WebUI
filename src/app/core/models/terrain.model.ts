export interface TerrainProviderConfig {
  name: string;
  url: string;
  requestVertexNormals?: boolean;
  requestWaterMask?: boolean;
}

export const DEFAULT_TERRAIN_PROVIDERS: TerrainProviderConfig[] = [
  {
    name: 'Cesium World Terrain',
    url: 'https://assets.cesium.com/1',
    requestVertexNormals: true,
    requestWaterMask: true,
  },
];
