import { Component, inject, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OGC_SERVICES_TOKEN } from '../../core/builders/ogc-service-registry.builder';
import { OgcServerConfig } from '../../core/models/ogc.model';
import { WmsService } from '../../core/services/wms.service';
import { WfsService } from '../../core/services/wfs.service';
import { WmtsService } from '../../core/services/wmts.service';
import { WmsServerConfig } from '../../core/models/wms.model';
import { WfsServerConfig } from '../../core/models/wfs.model';
import { WmtsServerConfig } from '../../core/models/wmts.model';
import { WmsServerItemComponent } from './wms-server-item/wms-server-item.component';
import { WfsServerItemComponent } from './wfs-server-item/wfs-server-item.component';
import { WmtsServerItemComponent } from './wmts-server-item/wmts-server-item.component';
import { AddServerDialogComponent } from './add-server-dialog/add-server-dialog.component';
import { AddWfsServerDialogComponent } from './add-wfs-server-dialog/add-wfs-server-dialog.component';
import { AddWmtsServerDialogComponent } from './add-wmts-server-dialog/add-wmts-server-dialog.component';

@Component({
  selector: 'app-layer-manager',
  standalone: true,
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    WmsServerItemComponent,
    WfsServerItemComponent,
    WmtsServerItemComponent,
  ],
  template: `
    <!-- Toggle button -->
    <button class="toggle-btn" (click)="panelOpen.set(!panelOpen())"
      matTooltip="Gestionnaire de couches (WMS / WFS / WMTS)" matTooltipPosition="left">
      <mat-icon>{{ panelOpen() ? 'close' : 'layers' }}</mat-icon>
      @if (totalActiveLayers() > 0 && !panelOpen()) {
        <span class="active-dot">{{ totalActiveLayers() }}</span>
      }
    </button>

    @if (panelOpen()) {
      <div class="panel">
        <!-- Panel header -->
        <div class="panel-header">
          <mat-icon class="header-icon">layers</mat-icon>
          <h3>Couches</h3>
          <span class="spacer"></span>
          @if (totalActiveLayers() > 0) {
            <span class="active-count">{{ totalActiveLayers() }} actif{{ totalActiveLayers() > 1 ? 's' : '' }}</span>
          }
        </div>

        <mat-tab-group animationDuration="150ms" class="tab-group">

          <!-- ── WMS ──────────────────────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">map</mat-icon> WMS
              @if (wmsService.activeLayers().length > 0) {
                <span class="tab-badge">{{ wmsService.activeLayers().length }}</span>
              }
            </ng-template>
            <div class="tab-content">
              <div class="tab-toolbar">
                <span class="tab-hint">Tuiles raster</span>
                <button mat-icon-button (click)="openAddDialog('WMS')" matTooltip="Ajouter un serveur WMS">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              <div class="server-list">
                @if (wmsService.servers().length === 0) {
                  <div class="empty-state">
                    <mat-icon>image_not_supported</mat-icon>
                    <p>Aucun serveur WMS</p>
                    <button mat-stroked-button (click)="openAddDialog('WMS')">
                      <mat-icon>add</mat-icon> Ajouter
                    </button>
                  </div>
                }
                @for (server of wmsService.servers(); track server.id) {
                  <app-wms-server-item [server]="server" />
                }
              </div>
            </div>
          </mat-tab>

          <!-- ── WFS ──────────────────────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">polyline</mat-icon> WFS
              @if (wfsService.activeLayers().length > 0) {
                <span class="tab-badge">{{ wfsService.activeLayers().length }}</span>
              }
            </ng-template>
            <div class="tab-content">
              <div class="tab-toolbar">
                <span class="tab-hint">Entités vecteur</span>
                <button mat-icon-button (click)="openAddDialog('WFS')" matTooltip="Ajouter un serveur WFS">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              <div class="server-list">
                @if (wfsService.servers().length === 0) {
                  <div class="empty-state">
                    <mat-icon>layers_clear</mat-icon>
                    <p>Aucun serveur WFS</p>
                    <button mat-stroked-button (click)="openAddDialog('WFS')">
                      <mat-icon>add</mat-icon> Ajouter
                    </button>
                  </div>
                }
                @for (server of wfsService.servers(); track server.id) {
                  <app-wfs-server-item [server]="server" />
                }
              </div>
            </div>
          </mat-tab>

          <!-- ── WMTS ─────────────────────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">grid_view</mat-icon> WMTS
              @if (wmtsService.activeLayers().length > 0) {
                <span class="tab-badge">{{ wmtsService.activeLayers().length }}</span>
              }
            </ng-template>
            <div class="tab-content">
              <div class="tab-toolbar">
                <span class="tab-hint">Tuiles OGC</span>
                <button mat-icon-button (click)="openAddDialog('WMTS')" matTooltip="Ajouter un serveur WMTS">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
              <div class="server-list">
                @if (wmtsService.servers().length === 0) {
                  <div class="empty-state">
                    <mat-icon>grid_off</mat-icon>
                    <p>Aucun serveur WMTS</p>
                    <button mat-stroked-button (click)="openAddDialog('WMTS')">
                      <mat-icon>add</mat-icon> Ajouter
                    </button>
                  </div>
                }
                @for (server of wmtsService.servers(); track server.id) {
                  <app-wmts-server-item [server]="server" />
                }
              </div>
            </div>
          </mat-tab>

        </mat-tab-group>

        @if (totalActiveLayers() > 0) {
          <div class="panel-footer">
            <mat-icon>layers</mat-icon>
            <span>{{ wmsService.activeLayers().length }} WMS · {{ wfsService.activeLayers().length }} WFS · {{ wmtsService.activeLayers().length }} WMTS</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      z-index: 10;
    }

    .toggle-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      background: rgba(18, 21, 32, 0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      color: #a0aec0;
      transition: color 0.15s, background 0.15s, transform 0.1s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { color: #82b1ff; background: rgba(91,141,239,0.18); transform: scale(1.05); }
      &:active { transform: scale(0.97); }
    }

    .active-dot {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      background: #5b8def;
      color: white;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      border: 1.5px solid rgba(18,21,32,0.9);
    }

    .panel {
      width: 340px;
      background: rgba(18, 21, 32, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: calc(100vh - 120px);
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 12px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }

    .header-icon { font-size: 18px; width: 18px; height: 18px; color: #5b8def; }
    h3 { margin: 0; font-size: 14px; font-weight: 600; color: #e2e6f0; }
    .spacer { flex: 1; }

    .active-count {
      font-size: 11px;
      font-weight: 600;
      color: #4caf72;
      background: rgba(76,175,114,0.15);
      border: 1px solid rgba(76,175,114,0.3);
      border-radius: 10px;
      padding: 2px 8px;
    }

    .tab-group {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      ::ng-deep .mat-mdc-tab-body-wrapper { flex: 1; overflow: hidden; }
      ::ng-deep .mat-mdc-tab-header { border-bottom: 1px solid rgba(255,255,255,0.07); }
    }

    .tab-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }

    .tab-badge {
      background: #5b8def;
      color: white;
      border-radius: 8px;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      margin-left: 4px;
    }

    .tab-content { display: flex; flex-direction: column; height: 100%; }

    .tab-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 6px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .tab-hint { font-size: 11px; color: #5a647a; font-style: italic; }

    .server-list { flex: 1; overflow-y: auto; padding: 8px; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 32px 16px;
      color: #3d4a5c;
      text-align: center;
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      p { margin: 0; font-size: 13px; color: #5a647a; }
    }

    .panel-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: rgba(76,175,114,0.08);
      color: #4caf72;
      font-size: 11px;
      font-weight: 500;
      flex-shrink: 0;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
  `],
})
export class LayerManagerComponent {
  // Type-specific services for tab-level binding
  wmsService = inject(WmsService);
  wfsService = inject(WfsService);
  wmtsService = inject(WmtsService);

  // OGC_SERVICES_TOKEN gives a uniform view over all services for cross-cutting concerns
  private allServices = inject(OGC_SERVICES_TOKEN);

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  panelOpen = signal(false);

  totalActiveLayers(): number {
    return this.allServices.reduce((n, s) => n + s.activeLayers().length, 0);
  }

  openAddDialog(type: 'WMS' | 'WFS' | 'WMTS'): void {
    let ref;
    if (type === 'WMS') {
      ref = this.dialog.open(AddServerDialogComponent, { width: '560px' });
    } else if (type === 'WFS') {
      ref = this.dialog.open(AddWfsServerDialogComponent, { width: '560px' });
    } else {
      ref = this.dialog.open(AddWmtsServerDialogComponent, { width: '560px' });
    }

    ref.afterClosed().subscribe(async (config: OgcServerConfig | null) => {
      if (!config) return;
      this.panelOpen.set(true);
      const service = type === 'WMS' ? this.wmsService
        : type === 'WFS' ? this.wfsService
        : this.wmtsService;
      try {
        await service.addServer(config);
        this.snackBar.open(`Serveur ${type} chargé`, 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open(
          `Échec ${type}. Vérifiez l'URL et le CORS du serveur.`,
          'Fermer',
          { duration: 6000, panelClass: 'snack-error' }
        );
      }
    });
  }
}
