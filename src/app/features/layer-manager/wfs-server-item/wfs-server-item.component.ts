import { Component, Input, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WfsServer } from '../../../core/models/wfs.model';
import { WfsService } from '../../../core/services/wfs.service';
import { WfsFeatureItemComponent } from '../wfs-feature-item/wfs-feature-item.component';

@Component({
  selector: 'app-wfs-server-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    WfsFeatureItemComponent,
  ],
  template: `
    <div class="server-header" (click)="expanded.set(!expanded())">
      @switch (server.status) {
        @case ('loading') {
          <mat-spinner diameter="16" class="status-spinner" />
        }
        @case ('ready') {
          <mat-icon class="status-icon ready">storage</mat-icon>
        }
        @case ('error') {
          <mat-icon class="status-icon error" [matTooltip]="server.error ?? ''">
            cloud_off
          </mat-icon>
        }
        @default {
          <mat-icon class="status-icon">storage</mat-icon>
        }
      }

      <div class="server-info">
        <span class="server-title" [matTooltip]="server.url" matTooltipShowDelay="600">
          {{ server.title }}
        </span>
        <span class="server-meta">WFS {{ server.version }}</span>
      </div>

      <!-- Feature type count badge -->
      @if (server.status === 'ready') {
        <span class="ft-badge" matTooltip="Types d'entités disponibles">
          {{ server.featureTypes.length }}
        </span>
      }

      <mat-icon class="expand-icon">
        {{ expanded() ? 'expand_less' : 'expand_more' }}
      </mat-icon>

      <button
        mat-icon-button
        class="remove-btn"
        (click)="remove($event)"
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
      <div class="feature-list">
        @if (server.featureTypes.length === 0) {
          <p class="empty">Aucun type d'entité disponible</p>
        }

        <!-- Search filter -->
        @if (server.featureTypes.length > 6) {
          <div class="search-row">
            <mat-icon class="search-icon">search</mat-icon>
            <input
              class="search-input"
              type="text"
              placeholder="Filtrer les couches…"
              [(value)]="filterText"
              (input)="filterText = $any($event.target).value"
            />
          </div>
        }

        @for (ft of filteredFeatureTypes(); track ft.id) {
          <app-wfs-feature-item [ft]="ft" [server]="server" />
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
      color: #666;
      &.ready { color: #1565c0; }
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

    .server-meta {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .ft-badge {
      font-size: 10px;
      font-weight: 700;
      background: #e3f2fd;
      color: #1565c0;
      border-radius: 8px;
      padding: 1px 6px;
      flex-shrink: 0;
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

    .feature-list {
      padding: 4px 0;
      max-height: 420px;
      overflow-y: auto;
    }

    .empty {
      font-size: 12px;
      color: #999;
      text-align: center;
      padding: 12px;
    }

    .search-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .search-icon { font-size: 16px; width: 16px; height: 16px; color: #999; }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 12px;
      background: transparent;
      color: #333;
      &::placeholder { color: #bbb; }
    }
  `],
})
export class WfsServerItemComponent {
  @Input({ required: true }) server!: WfsServer;

  private wfsService = inject(WfsService);

  expanded = signal(true);
  filterText = '';

  filteredFeatureTypes() {
    const q = this.filterText.toLowerCase();
    if (!q) return this.server.featureTypes;
    return this.server.featureTypes.filter(
      ft =>
        ft.title.toLowerCase().includes(q) ||
        ft.name.toLowerCase().includes(q)
    );
  }

  remove(event: MouseEvent): void {
    event.stopPropagation();
    this.wfsService.removeServer(this.server.id);
  }
}
