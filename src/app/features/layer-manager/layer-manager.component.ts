import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { WmsService } from '../../core/services/wms.service';
import { WmsServerItemComponent } from './wms-server-item/wms-server-item.component';
import { AddServerDialogComponent } from './add-server-dialog/add-server-dialog.component';

@Component({
  selector: 'app-layer-manager',
  standalone: true,
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
    WmsServerItemComponent,
  ],
  template: `
    <!-- Toggle FAB -->
    <button
      mat-fab
      extended
      [color]="panelOpen() ? 'accent' : 'primary'"
      class="toggle-fab"
      (click)="panelOpen.set(!panelOpen())"
      matTooltip="Gestionnaire de couches WMS"
    >
      <mat-icon>layers</mat-icon>
      Couches WMS
      @if (wmsService.activeLayers().length > 0) {
        <span class="active-badge">{{ wmsService.activeLayers().length }}</span>
      }
    </button>

    <!-- Side panel -->
    @if (panelOpen()) {
      <div class="panel">
        <!-- Header -->
        <div class="panel-header">
          <mat-icon>layers</mat-icon>
          <h3>Couches WMS</h3>
          <span class="spacer"></span>
          <button
            mat-icon-button
            (click)="openAddServerDialog()"
            matTooltip="Ajouter un serveur WMS"
          >
            <mat-icon>add_circle_outline</mat-icon>
          </button>
          <button mat-icon-button (click)="panelOpen.set(false)" matTooltip="Fermer">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <mat-divider />

        <!-- Server list -->
        <div class="panel-content">
          @if (wmsService.servers().length === 0) {
            <div class="empty-state">
              <mat-icon>layers_clear</mat-icon>
              <p>Aucun serveur WMS ajouté</p>
              <button mat-stroked-button color="primary" (click)="openAddServerDialog()">
                <mat-icon>add</mat-icon>
                Ajouter un serveur
              </button>
            </div>
          }

          @for (server of wmsService.servers(); track server.id) {
            <app-wms-server-item [server]="server" />
          }
        </div>

        <!-- Footer: active layers summary -->
        @if (wmsService.activeLayers().length > 0) {
          <mat-divider />
          <div class="panel-footer">
            <mat-icon>check_circle</mat-icon>
            <span>{{ wmsService.activeLayers().length }} couche(s) active(s)</span>
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

    .toggle-fab {
      position: relative;
    }

    .active-badge {
      background: #fff;
      color: #1565c0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      margin-left: 4px;
      line-height: 16px;
    }

    .panel {
      width: 320px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
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

      mat-icon { color: white; }

      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .spacer { flex: 1; }

      button { color: white; }
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 16px;
      color: #999;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ccc;
      }

      p {
        margin: 0;
        font-size: 13px;
      }
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

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
  `],
})
export class LayerManagerComponent {
  wmsService = inject(WmsService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  panelOpen = signal(false);

  openAddServerDialog(): void {
    const ref = this.dialog.open(AddServerDialogComponent, { width: '560px' });

    ref.afterClosed().subscribe(async (url: string | null) => {
      if (!url) return;
      this.panelOpen.set(true);
      try {
        await this.wmsService.addServer(url);
        this.snackBar.open('Serveur WMS chargé avec succès', 'OK', { duration: 3000 });
      } catch {
        this.snackBar.open(
          'Échec du chargement. Vérifiez l\'URL et le CORS du serveur.',
          'Fermer',
          { duration: 6000, panelClass: 'snack-error' }
        );
      }
    });
  }
}
