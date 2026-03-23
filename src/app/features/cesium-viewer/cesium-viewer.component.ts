import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as Cesium from 'cesium';
import { CESIUM_ADAPTERS_TOKEN } from '../../core/builders/ogc-service-registry.builder';
import { TerrainService } from '../../core/services/terrain.service';
import { FeatureInfoService } from '../../core/services/feature-info.service';
import { TerrainDialogComponent } from '../terrain-dialog/terrain-dialog.component';
import { TerrainProviderConfig } from '../../core/models/terrain.model';
import { LayerManagerComponent } from '../layer-manager/layer-manager.component';
import { FeatureInfoPanelComponent } from '../feature-info-panel/feature-info-panel.component';

(window as any)['CESIUM_BASE_URL'] = '/cesium';

@Component({
  selector: 'app-cesium-viewer',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    LayerManagerComponent,
    FeatureInfoPanelComponent,
  ],
  template: `
    <div class="viewer-container">
      <div #cesiumContainer class="cesium-container"></div>

      <!-- Toolbar (bottom-left) -->
      <div class="toolbar">
        <button mat-fab extended color="primary" (click)="openTerrainDialog()"
          matTooltip="Configurer le terrain quantized-mesh">
          <mat-icon>terrain</mat-icon>
          Terrain
        </button>

        @if (terrainService.activeTerrainConfig(); as cfg) {
          <div class="terrain-badge">
            <mat-icon>check_circle</mat-icon>
            {{ cfg.name }}
            <button mat-icon-button (click)="removeTerrain()" matTooltip="Supprimer le terrain">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
      </div>

      <!-- WMS + WFS + WMTS layer manager (top-right) -->
      <app-layer-manager />

      <!-- GetFeatureInfo result panel (bottom-left, above toolbar) -->
      <app-feature-info-panel />

      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48" />
          <span>Connexion au terrain…</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .viewer-container { position: relative; width: 100%; height: 100%; }
    .cesium-container { width: 100%; height: 100%; }
    .toolbar { position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 10; }
    .terrain-badge { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.92); backdrop-filter: blur(4px); border-radius: 20px; padding: 4px 8px 4px 12px; font-size: 13px; font-weight: 500; color: #1b5e20; box-shadow: 0 2px 6px rgba(0,0,0,0.2); mat-icon { font-size: 18px; width: 18px; height: 18px; color: #2e7d32; } }
    .loading-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: white; font-size: 16px; z-index: 20; }
  `],
})
export class CesiumViewerComponent implements OnInit, OnDestroy {
  @ViewChild('cesiumContainer', { static: true }) cesiumContainer!: ElementRef<HTMLDivElement>;

  terrainService = inject(TerrainService);
  private featureInfoService = inject(FeatureInfoService);

  // All Cesium adapters registered via OgcServiceRegistryBuilder
  private cesiumAdapters = inject(CESIUM_ADAPTERS_TOKEN);

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  private viewer!: Cesium.Viewer;

  ngOnInit(): void {
    this.initViewer();
  }

  ngOnDestroy(): void {
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }

  private initViewer(): void {
    this.viewer = new Cesium.Viewer(this.cesiumContainer.nativeElement, {
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
          { fileExtension: 'jpg' }
        )
      ),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      geocoder: false,
      homeButton: true,
      sceneModePicker: true,
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      selectionIndicator: true,
      infoBox: true,
    });

    this.viewer.scene.globe.depthTestAgainstTerrain = true;

    // Initialise terrain service
    this.terrainService.setViewer(this.viewer);

    // Initialise all registered Cesium data adapters (WMS, WFS, …) uniformly
    this.cesiumAdapters.forEach(adapter => adapter.setViewer(this.viewer));

    // GetFeatureInfo: query active WMS layers on left-click.
    this.viewer.screenSpaceEventHandler.setInputAction(
      (movement: { position: Cesium.Cartesian2 }) => {
        this.featureInfoService.query(
          { x: movement.position.x, y: movement.position.y },
          this.viewer
        );
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );
  }

  openTerrainDialog(): void {
    const ref = this.dialog.open(TerrainDialogComponent, { width: '540px' });
    ref.afterClosed().subscribe(async (config: TerrainProviderConfig | undefined) => {
      if (!config) return;
      this.loading.set(true);
      try {
        await this.terrainService.applyTerrain(config);
        this.snackBar.open(`Terrain "${config.name}" connecté`, 'OK', { duration: 3000 });
      } catch (err: any) {
        this.snackBar.open(`Erreur : ${err?.message ?? 'Connexion impossible'}`, 'Fermer', {
          duration: 5000, panelClass: 'snack-error',
        });
      } finally {
        this.loading.set(false);
      }
    });
  }

  removeTerrain(): void {
    this.terrainService.removeTerrain();
    this.snackBar.open('Terrain supprimé', 'OK', { duration: 2000 });
  }
}
