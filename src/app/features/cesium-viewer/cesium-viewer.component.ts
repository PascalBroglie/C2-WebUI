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
import { CesiumService } from '../../core/services/cesium.service';
import { TerrainDialogComponent } from '../terrain-dialog/terrain-dialog.component';
import { TerrainProviderConfig } from '../../core/models/terrain.model';
import { LayerManagerComponent } from '../layer-manager/layer-manager.component';
import { FeatureInfoPanelComponent } from '../feature-info-panel/feature-info-panel.component';
import { CompassComponent } from '../map-controls/compass.component';
import { TimelineBarComponent } from '../map-controls/timeline-bar.component';

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
    CompassComponent,
    TimelineBarComponent,
  ],
  template: `
    <div class="viewer-container" (mousemove)="onMouseMove($event)">
      <div #cesiumContainer class="cesium-container"></div>

      <!-- ── Floating toolbar (top-left) ─────────────────────────────────── -->
      <div class="toolbar">

        <!-- Terrain -->
        <button class="tool-btn" (click)="openTerrainDialog()"
          matTooltip="Configurer le terrain" matTooltipPosition="right">
          <mat-icon>terrain</mat-icon>
        </button>

        <!-- Separator -->
        <div class="tool-sep"></div>

        <!-- Zoom In -->
        <button class="tool-btn" (click)="cs.zoomIn()"
          matTooltip="Zoom avant" matTooltipPosition="right">
          <mat-icon>add</mat-icon>
        </button>

        <!-- Zoom Out -->
        <button class="tool-btn" (click)="cs.zoomOut()"
          matTooltip="Zoom arrière" matTooltipPosition="right">
          <mat-icon>remove</mat-icon>
        </button>

        <!-- Home -->
        <button class="tool-btn" (click)="cs.flyHome()"
          matTooltip="Vue globale" matTooltipPosition="right">
          <mat-icon>home</mat-icon>
        </button>

        <!-- Separator -->
        <div class="tool-sep"></div>

        <!-- 2D / 3D toggle -->
        <button class="tool-btn" (click)="cs.toggleSceneMode()"
          [matTooltip]="cs.sceneIs3D() ? 'Passer en 2D' : 'Passer en 3D'" matTooltipPosition="right">
          <mat-icon>{{ cs.sceneIs3D() ? 'map' : 'public' }}</mat-icon>
        </button>

        <!-- Fullscreen -->
        <button class="tool-btn" (click)="cs.toggleFullscreen()"
          [matTooltip]="cs.isFullscreen() ? 'Quitter le plein écran' : 'Plein écran'" matTooltipPosition="right">
          <mat-icon>{{ cs.isFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</mat-icon>
        </button>

      </div>

      <!-- Terrain active chip (below toolbar) -->
      @if (terrainService.activeTerrainConfig(); as cfg) {
        <div class="terrain-chip">
          <mat-icon>check_circle</mat-icon>
          <span class="chip-label">{{ cfg.name }}</span>
          <button class="chip-close" (click)="removeTerrain()" matTooltip="Supprimer">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }

      <!-- ── Layer manager (top-right) ──────────────────────────────────── -->
      <app-layer-manager />

      <!-- ── Feature info panel (bottom-left, above timeline) ───────────── -->
      <app-feature-info-panel />

      <!-- ── Compass (bottom-right, above timeline) ─────────────────────── -->
      <app-compass />

      <!-- ── Timeline bar (bottom) ──────────────────────────────────────── -->
      <app-timeline-bar />

      <!-- Loading overlay -->
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="40" />
          <span>Connexion au terrain…</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .viewer-container { position: relative; width: 100%; height: 100%; }
    .cesium-container { width: 100%; height: 100%; }

    /* ── Toolbar ───────────────────────────────────────────────────────────── */
    .toolbar {
      position: absolute;
      top: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      z-index: 10;
      background: rgba(18, 21, 32, 0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.55);
    }

    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      background: transparent;
      color: #8892a4;
      transition: color 0.15s, background 0.15s, transform 0.1s;
      padding: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { color: #82b1ff; background: rgba(91,141,239,0.15); }
      &:active { transform: scale(0.93); }
    }

    .tool-sep {
      width: 22px;
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 2px 0;
      flex-shrink: 0;
    }

    /* ── Terrain chip ──────────────────────────────────────────────────────── */
    .terrain-chip {
      position: absolute;
      top: 16px;
      left: 68px;        /* right of toolbar */
      display: flex;
      align-items: center;
      gap: 5px;
      background: rgba(18, 21, 32, 0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(76,175,114,0.35);
      border-radius: 22px;
      padding: 4px 6px 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #4caf72;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      max-width: 200px;
      z-index: 10;
      mat-icon { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; }
    }

    .chip-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chip-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      background: transparent;
      color: #4caf72;
      padding: 0;
      flex-shrink: 0;
      transition: background 0.15s;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { background: rgba(255,255,255,0.1); }
    }

    /* ── Loading overlay ───────────────────────────────────────────────────── */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: #e2e6f0;
      font-size: 14px;
      z-index: 20;
    }
  `],
})
export class CesiumViewerComponent implements OnInit, OnDestroy {
  @ViewChild('cesiumContainer', { static: true }) cesiumContainer!: ElementRef<HTMLDivElement>;

  terrainService = inject(TerrainService);
  cs = inject(CesiumService);

  private featureInfoService = inject(FeatureInfoService);
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

  onMouseMove(event: MouseEvent): void {
    this.cs.pickCoordinates(event.offsetX, event.offsetY);
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
      homeButton: false,          // using custom home button
      sceneModePicker: false,     // using custom 2D/3D toggle
      baseLayerPicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,    // using custom fullscreen
      selectionIndicator: true,
      infoBox: true,
    });

    this.viewer.scene.globe.depthTestAgainstTerrain = true;

    // Register viewer with all services
    this.terrainService.setViewer(this.viewer);
    this.cs.setViewer(this.viewer);
    this.cesiumAdapters.forEach(adapter => adapter.setViewer(this.viewer));

    // GetFeatureInfo on left-click
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
