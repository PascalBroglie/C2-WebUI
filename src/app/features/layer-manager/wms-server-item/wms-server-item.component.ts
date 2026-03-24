import { Component, Input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WmsServer } from '../../../core/models/wms.model';
import { WmsService } from '../../../core/services/wms.service';
import { WmsLayerItemComponent } from '../wms-layer-item/wms-layer-item.component';

@Component({
  selector: 'app-wms-server-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    WmsLayerItemComponent,
  ],
  template: `
    <div class="server-header" (click)="expanded.set(!expanded())">
      <!-- Status indicator -->
      @switch (server.status) {
        @case ('loading') {
          <mat-spinner diameter="16" class="status-spinner" />
        }
        @case ('ready') {
          <mat-icon class="status-icon ready">cloud_done</mat-icon>
        }
        @case ('error') {
          <mat-icon class="status-icon error" [matTooltip]="server.error ?? ''">
            cloud_off
          </mat-icon>
        }
        @default {
          <mat-icon class="status-icon">cloud</mat-icon>
        }
      }

      <!-- Server title -->
      <div class="server-info">
        <span class="server-title" [matTooltip]="server.url" matTooltipShowDelay="600">
          {{ server.title }}
        </span>
        <span class="server-version">WMS {{ server.version }}</span>
      </div>

      <!-- Expand / collapse -->
      <mat-icon class="expand-icon">
        {{ expanded() ? 'expand_less' : 'expand_more' }}
      </mat-icon>

      <!-- Remove button -->
      <button
        mat-icon-button
        class="remove-btn"
        (click)="removeServer($event)"
        matTooltip="Supprimer ce serveur"
      >
        <mat-icon>delete_outline</mat-icon>
      </button>
    </div>

    @if (server.status === 'error') {
      <div class="error-message">
        <mat-icon>warning</mat-icon>
        <span>{{ server.error ?? 'Erreur de connexion' }}</span>
      </div>
    }

    @if (expanded() && server.status === 'ready') {
      <div class="layer-list">
        @if (server.layers.length === 0) {
          <p class="no-layers">Aucune couche disponible</p>
        }
        @for (layer of server.layers; track layer.id) {
          <app-wms-layer-item [layer]="layer" [server]="server" [depth]="0" />
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 6px;
      background: rgba(255,255,255,0.03);
    }

    .server-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 12px;
      cursor: pointer;
      transition: background 0.15s;

      &:hover { background: rgba(255,255,255,0.05); }
    }

    .status-spinner { flex-shrink: 0; }

    .status-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: #5a647a;

      &.ready { color: #4caf72; }
      &.error { color: #ef5350; }
    }

    .server-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .server-title {
      font-size: 13px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #c8d0de;
    }

    .server-version {
      font-size: 10px;
      color: #3d4a5c;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #3d4a5c;
      flex-shrink: 0;
    }

    .remove-btn {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      color: #3d4a5c;

      &:hover { color: #ef5350; }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(239,83,80,0.1);
      border-top: 1px solid rgba(239,83,80,0.2);
      color: #ef9a9a;
      font-size: 12px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .layer-list {
      padding: 4px 0;
      max-height: 400px;
      overflow-y: auto;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .no-layers {
      font-size: 12px;
      color: #3d4a5c;
      text-align: center;
      padding: 12px;
    }
  `],
})
export class WmsServerItemComponent {
  @Input({ required: true }) server!: WmsServer;

  private wmsService = inject(WmsService);
  expanded = signal(true);

  removeServer(event: MouseEvent): void {
    event.stopPropagation();
    this.wmsService.removeServer(this.server.id);
  }
}
