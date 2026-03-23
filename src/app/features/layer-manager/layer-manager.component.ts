import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { WmsService } from '../../core/services/wms.service';
import { WfsService } from '../../core/services/wfs.service';
import { WmsServerItemComponent } from './wms-server-item/wms-server-item.component';
import { WfsServerItemComponent } from './wfs-server-item/wfs-server-item.component';
import { AddServerDialogComponent } from './add-server-dialog/add-server-dialog.component';
import { AddWfsServerDialogComponent } from './add-wfs-server-dialog/add-wfs-server-dialog.component';

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
  ],
  template: `
    <!-- Toggle FAB -->
    <button
      mat-fab
      extended
      [color]="panelOpen() ? 'accent' : 'primary'"
      class="toggle-fab"
      (click)="panelOpen.set(!panelOpen())"
      matTooltip="Gestionnaire de couches (WMS / WFS)"
    >
      <mat-icon>layers</mat-icon>
      Couches
      @if (totalActiveLayers() > 0) {
        <span class="active-badge">{{ totalActiveLayers() }}</span>
      }
    </button>

    <!-- Panel -->
    @if (panelOpen()) {
      <div class="panel">
        <!-- Header -->
        <div class="panel-header">
          <mat-icon>layers</mat-icon>
          <h3>Gestionnaire de couches</h3>
          <span class="spacer"></span>
          <button mat-icon-button (click)="panelOpen.set(false)" matTooltip="Fermer">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Tabs WMS / WFS -->
        <mat-tab-group
          animationDuration="150ms"
          class="tab-group"
          (selectedIndexChange)="activeTab.set($event)"
        >
          <!-- ── WMS tab ─────────────────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">map</mat-icon>
              WMS
              @if (wmsService.activeLayers().length > 0) {
                <span class="tab-badge">{{ wmsService.activeLayers().length }}</span>
              }
            </ng-template>

            <div class="tab-content">
              <div class="tab-toolbar">
                <span class="tab-hint">Services de tuiles (raster)</span>
                <button
                  mat-icon-button
                  (click)="openAddWmsDialog()"
                  matTooltip="Ajouter un serveur WMS"
                >
                  <mat-icon>add_circle_outline</mat-icon>
                </button>
              </div>

              <div class="server-list">
                @if (wmsService.servers().length === 0) {
                  <div class="empty-state">
                    <mat-icon>image_not_supported</mat-icon>
                    <p>Aucun serveur WMS</p>
                    <button mat-stroked-button color="primary" (click)="openAddWmsDialog()">
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

          <!-- ── WFS tab ─────────────────────────────────────────────────────── -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-icon">polyline</mat-icon>
              WFS
              @if (wfsService.activeLayers().length > 0) {
                <span class="tab-badge">{{ wfsService.activeLayers().length }}</span>
              }
            </ng-template>

            <div class="tab-content">
              <div class="tab-toolbar">
                <span class="tab-hint">Services d'entités vecteur</span>
                <button
                  mat-icon-button
                  (click)="openAddWfsDialog()"
                  matTooltip="Ajouter un serveur WFS"
                >
                  <mat-icon>add_circle_outline</mat-icon>
                </button>
              </div>

              <div class="server-list">
                @if (wfsService.servers().length === 0) {
                  <div class="empty-state">
                    <mat-icon>layers_clear</mat-icon>
                    <p>Aucun serveur WFS</p>
                    <button mat-stroked-button color="primary" (click)="openAddWfsDialog()">
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
        </mat-tab-group>

        <!-- Footer: active layer summary -->
        @if (totalActiveLayers() > 0) {
          <mat-divider />
          <div class="panel-footer">
            <mat-icon>check_circle</mat-icon>
            <span>
              {{ wmsService.activeLayers().length }} WMS •
              {{ wfsService.activeLayers().length }} WFS actif(s)
            </span>
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

    .active-badge {
      background: #fff;
      color: #1565c0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      margin-left: 4px;
    }

    .panel {
      width: 340px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: calc(100vh - 120px);
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 8px 10px 16px;
      background: #1565c0;
      color: white;
      flex-shrink: 0;

      mat-icon { color: white; }
      h3 { margin: 0; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; }
      .spacer { flex: 1; }
      button { color: white; }
    }

    .tab-group {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;

      ::ng-deep .mat-mdc-tab-body-wrapper {
        flex: 1;
        overflow: hidden;
      }
    }

    .tab-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .tab-badge {
      background: #1565c0;
      color: white;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 5px;
      margin-left: 4px;
    }

    .tab-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .tab-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px 6px 12px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .tab-hint {
      font-size: 11px;
      color: #999;
      font-style: italic;
    }

    .server-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 28px 16px;
      color: #bbb;
      text-align: center;

      mat-icon { font-size: 40px; width: 40px; height: 40px; }
      p { margin: 0; font-size: 13px; color: #999; }
    }

    .panel-footer {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 12px;
      font-weight: 500;
      flex-shrink: 0;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
  `],
})
export class LayerManagerComponent {
  wmsService = inject(WmsService);
  wfsService = inject(WfsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  panelOpen = signal(false);
  activeTab = signal(0);

  totalActiveLayers() {
    return this.wmsService.activeLayers().length + this.wfsService.activeLayers().length;
  }

  openAddWmsDialog(): void {
    const ref = this.dialog.open(AddServerDialogComponent, { width: '560px' });
    ref.afterClosed().subscribe(async (url: string | null) => {
      if (!url) return;
      this.panelOpen.set(true);
      try {
        await this.wmsService.addServer(url);
        this.snackBar.open('Serveur WMS chargé', 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open(
          'Échec WMS. Vérifiez l\'URL et le CORS du serveur.',
          'Fermer',
          { duration: 6000, panelClass: 'snack-error' }
        );
      }
    });
  }

  openAddWfsDialog(): void {
    const ref = this.dialog.open(AddWfsServerDialogComponent, { width: '560px' });
    ref.afterClosed().subscribe(async (url: string | null) => {
      if (!url) return;
      this.panelOpen.set(true);
      try {
        await this.wfsService.addServer(url);
        this.snackBar.open('Serveur WFS chargé', 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open(
          'Échec WFS. Vérifiez l\'URL et le CORS du serveur.',
          'Fermer',
          { duration: 6000, panelClass: 'snack-error' }
        );
      }
    });
  }
}
