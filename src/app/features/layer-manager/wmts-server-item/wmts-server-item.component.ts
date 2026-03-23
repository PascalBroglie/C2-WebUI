import { Component, Input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WmtsServer } from '../../../core/models/wmts.model';
import { WmtsService } from '../../../core/services/wmts.service';
import { WmtsLayerItemComponent } from '../wmts-layer-item/wmts-layer-item.component';

@Component({
  selector: 'app-wmts-server-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    WmtsLayerItemComponent,
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
        <span class="server-version">WMTS {{ server.version }}</span>
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
          <app-wmts-layer-item [layer]="layer" [server]="server" />
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .server-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 12px;
      cursor: pointer;
      background: #fafafa;
      transition: background 0.15s;

      &:hover { background: #f0f0f0; }
    }

    .status-spinner { flex-shrink: 0; }

    .status-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;

      &.ready { color: #2e7d32; }
      &.error { color: #c62828; }
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
      color: #212121;
    }

    .server-version {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .expand-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
      flex-shrink: 0;
    }

    .remove-btn {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      color: #999;

      &:hover { color: #c62828; }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #fff3e0;
      color: #e65100;
      font-size: 12px;

      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .layer-list {
      padding: 4px 0;
      max-height: 400px;
      overflow-y: auto;
    }

    .no-layers {
      font-size: 12px;
      color: #999;
      text-align: center;
      padding: 12px;
    }
  `],
})
export class WmtsServerItemComponent {
  @Input({ required: true }) server!: WmtsServer;

  private wmtsService = inject(WmtsService);
  expanded = signal(true);

  removeServer(event: MouseEvent): void {
    event.stopPropagation();
    this.wmtsService.removeServer(this.server.id);
  }
}
