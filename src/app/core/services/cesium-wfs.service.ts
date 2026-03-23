import { Injectable } from '@angular/core';
import * as Cesium from 'cesium';
import { WfsBoundingBox, WfsLayerStyle } from '../models/wfs.model';

@Injectable({ providedIn: 'root' })
export class CesiumWfsService {
  private viewer: Cesium.Viewer | null = null;
  private dsMap = new Map<string, Cesium.GeoJsonDataSource>();

  setViewer(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
  }

  /**
   * Loads a GeoJSON FeatureCollection into Cesium as a GeoJsonDataSource.
   * Points → billboards, lines → polylines, polygons → filled polygons.
   * Cesium uses its built-in infoBox to display feature properties on click.
   */
  async loadGeoJson(
    id: string,
    geoJson: object,
    style: WfsLayerStyle,
    boundingBox?: WfsBoundingBox
  ): Promise<void> {
    if (!this.viewer) return;

    // Remove any existing DataSource for this id
    this.removeDataSource(id);

    const stroke = Cesium.Color.fromCssColorString(style.color);
    const fill = stroke.withAlpha(style.opacity * 0.5);

    const dataSource = await Cesium.GeoJsonDataSource.load(geoJson as any, {
      stroke,
      fill,
      strokeWidth: style.strokeWidth,
      markerSize: 28,
      markerColor: stroke,
      clampToGround: true,
    });

    // Enrich each entity so Cesium's infoBox shows a properties table
    dataSource.entities.values.forEach(entity => {
      const props = entity.properties;
      if (!props) return;

      const rows = props.propertyNames
        .map((key: string) => {
          const val = props[key]?.getValue(Cesium.JulianDate.now()) ?? '';
          return `<tr><th>${key}</th><td>${val}</td></tr>`;
        })
        .join('');

      entity.description = new Cesium.ConstantProperty(
        `<table class="cesium-infoBox-defaultTable"><tbody>${rows}</tbody></table>`
      );
    });

    await this.viewer.dataSources.add(dataSource);
    this.dsMap.set(id, dataSource);

    // Fly to bounding box or to the data source extent
    if (boundingBox) {
      this.viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(
          boundingBox.minX,
          boundingBox.minY,
          boundingBox.maxX,
          boundingBox.maxY
        ),
      });
    } else if (dataSource.entities.values.length > 0) {
      await this.viewer.flyTo(dataSource);
    }
  }

  removeDataSource(id: string): void {
    const ds = this.dsMap.get(id);
    if (ds && this.viewer) {
      this.viewer.dataSources.remove(ds, true);
      this.dsMap.delete(id);
    }
  }

  setOpacity(id: string, opacity: number): void {
    const ds = this.dsMap.get(id);
    if (!ds) return;
    ds.entities.values.forEach(entity => {
      if (entity.polygon) {
        const currentFill = entity.polygon.material as Cesium.ColorMaterialProperty;
        if (currentFill?.color) {
          const c = currentFill.color.getValue(Cesium.JulianDate.now());
          entity.polygon.material = new Cesium.ColorMaterialProperty(
            new Cesium.ConstantProperty(c.withAlpha(opacity * 0.5))
          );
        }
      }
      if (entity.polyline?.material) {
        const mat = entity.polyline.material as Cesium.ColorMaterialProperty;
        if (mat?.color) {
          const c = mat.color.getValue(Cesium.JulianDate.now());
          entity.polyline.material = new Cesium.ColorMaterialProperty(
            new Cesium.ConstantProperty(c.withAlpha(opacity))
          );
        }
      }
      if (entity.billboard) {
        entity.billboard.color = new Cesium.ConstantProperty(
          Cesium.Color.WHITE.withAlpha(opacity)
        );
      }
    });
  }

  setColor(id: string, color: string): void {
    const ds = this.dsMap.get(id);
    if (!ds) return;
    const stroke = Cesium.Color.fromCssColorString(color);
    const fill = stroke.withAlpha(0.4);

    ds.entities.values.forEach(entity => {
      if (entity.polygon) {
        entity.polygon.material = new Cesium.ColorMaterialProperty(
          new Cesium.ConstantProperty(fill)
        );
        (entity.polygon.outlineColor as any) = new Cesium.ConstantProperty(stroke);
      }
      if (entity.polyline) {
        entity.polyline.material = new Cesium.ColorMaterialProperty(
          new Cesium.ConstantProperty(stroke)
        );
      }
      if (entity.billboard) {
        entity.billboard.color = new Cesium.ConstantProperty(stroke);
      }
      if (entity.point) {
        entity.point.color = new Cesium.ConstantProperty(stroke);
      }
    });
  }

  setVisibility(id: string, visible: boolean): void {
    const ds = this.dsMap.get(id);
    if (ds) ds.show = visible;
  }

  zoomTo(id: string): void {
    const ds = this.dsMap.get(id);
    if (ds && this.viewer) this.viewer.flyTo(ds);
  }
}
