import { Injectable, signal } from '@angular/core';
import * as Cesium from 'cesium';

export interface MapCoordinates {
  lat: number;
  lon: number;
  alt: number;
}

@Injectable({ providedIn: 'root' })
export class CesiumService {
  private _viewer: Cesium.Viewer | null = null;

  readonly heading = signal(0);       // degrees, 0 = north
  readonly sceneIs3D = signal(true);
  readonly coordinates = signal<MapCoordinates | null>(null);
  readonly isFullscreen = signal(false);

  setViewer(viewer: Cesium.Viewer): void {
    this._viewer = viewer;
    this._initClock(viewer);
    this._initListeners(viewer);
  }

  get viewer(): Cesium.Viewer | null {
    return this._viewer;
  }

  private _initClock(viewer: Cesium.Viewer): void {
    const start = Cesium.JulianDate.fromIso8601('2020-01-01T00:00:00Z');
    const stop  = Cesium.JulianDate.fromIso8601('2030-12-31T23:59:59Z');
    viewer.clock.startTime    = start.clone();
    viewer.clock.stopTime     = stop.clone();
    viewer.clock.currentTime  = Cesium.JulianDate.now();
    viewer.clock.clockRange   = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier   = 3600;       // 1 h / sec by default
    viewer.clock.shouldAnimate = false;
  }

  private _initListeners(viewer: Cesium.Viewer): void {
    viewer.scene.postRender.addEventListener(() => {
      // heading
      const deg = ((Cesium.Math.toDegrees(viewer.camera.heading) % 360) + 360) % 360;
      if (Math.abs(deg - this.heading()) > 0.3) {
        this.heading.set(deg);
      }
      // scene mode
      const is3D = viewer.scene.mode !== Cesium.SceneMode.SCENE2D;
      if (is3D !== this.sceneIs3D()) {
        this.sceneIs3D.set(is3D);
      }
    });

    // fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen.set(!!document.fullscreenElement);
    });
  }

  // ── Camera controls ────────────────────────────────────────────────────────

  zoomIn(): void {
    const v = this._viewer;
    if (!v) return;
    v.camera.zoomIn(v.camera.positionCartographic.height * 0.35);
  }

  zoomOut(): void {
    const v = this._viewer;
    if (!v) return;
    v.camera.zoomOut(v.camera.positionCartographic.height * 0.55);
  }

  flyHome(): void {
    this._viewer?.camera.flyHome(1.2);
  }

  resetNorth(): void {
    const v = this._viewer;
    if (!v) return;
    v.camera.flyTo({
      destination: v.camera.positionWC,
      orientation: { heading: 0, pitch: v.camera.pitch, roll: 0 },
      duration: 0.8,
    });
  }

  toggleSceneMode(): void {
    const v = this._viewer;
    if (!v) return;
    if (v.scene.mode === Cesium.SceneMode.SCENE3D) {
      v.scene.morphTo2D(1.2);
    } else {
      v.scene.morphTo3D(1.2);
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ── Coordinates ────────────────────────────────────────────────────────────

  pickCoordinates(x: number, y: number): void {
    const v = this._viewer;
    if (!v) return;
    try {
      const cartesian = v.camera.pickEllipsoid(
        new Cesium.Cartesian2(x, y),
        v.scene.globe.ellipsoid,
      );
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        this.coordinates.set({
          lat: Cesium.Math.toDegrees(carto.latitude),
          lon: Cesium.Math.toDegrees(carto.longitude),
          alt: carto.height,
        });
      } else {
        this.coordinates.set(null);
      }
    } catch {
      this.coordinates.set(null);
    }
  }
}
