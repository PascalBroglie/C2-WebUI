import { Component, Input, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WfsFeatureType, WfsServer, WFS_COLOR_PALETTE } from '../../../core/models/wfs.model';
import { WfsService } from '../../../core/services/wfs.service';

@Component({
  selector: 'app-wfs-feature-item',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  template: `
    <div class="feature-row">
      <!-- Loading spinner / geometry icon -->
      @if (activeLayer()?.loadStatus === 'loading') {
        <mat-spinner diameter="16" class="spinner" />
      } @else {
        <mat-icon class="geo-icon" [style.color]="activeLayer()?.style?.color ?? '#666'">
          {{ geometryIcon }}
        </mat-icon>
      }

      <!-- Toggle checkbox -->
      <mat-checkbox
        class="feature-label"
        [checked]="wfsService.isFeatureTypeActive(ft.id)"
        [disabled]="activeLayer()?.loadStatus === 'loading'"
        (change)="toggle()"
        [matTooltip]="ft.abstract ?? ft.name"
        matTooltipShowDelay="800"
      >
        {{ ft.title }}
      </mat-checkbox>

      <!-- Feature count badge -->
      @if (activeLayer()?.loadStatus === 'ready') {
        <span class="count-badge" [matTooltip]="'Entités chargées'">
          {{ activeLayer()!.featureCount | number }}
        </span>
      }

      <!-- Zoom to -->
      @if (wfsService.isFeatureTypeActive(ft.id)) {
        <button
          mat-icon-button
          class="action-btn"
          (click)="zoomTo()"
          matTooltip="Zoomer sur la couche"
        >
          <mat-icon>zoom_in_map</mat-icon>
        </button>
      }
    </div>

    <!-- Error message -->
    @if (activeLayer()?.loadStatus === 'error') {
      <div class="error-row">
        <mat-icon>warning</mat-icon>
        <span>{{ activeLayer()?.error }}</span>
      </div>
    }

    <!-- Controls: opacity + color (visible when active and ready) -->
    @if (activeLayer()?.loadStatus === 'ready') {
      <div class="controls-row">
        <!-- Opacity -->
        <mat-icon class="ctrl-icon" matTooltip="Opacité">opacity</mat-icon>
        <mat-slider class="opacity-slider" min="0" max="1" step="0.05" discrete>
          <input
            matSliderThumb
            [value]="activeLayer()!.style.opacity"
            (valueChange)="setOpacity($event)"
          />
        </mat-slider>

        <!-- Color palette -->
        <div class="palette">
          @for (color of palette; track color) {
            <button
              class="color-swatch"
              [style.background]="color"
              [class.selected]="activeLayer()!.style.color === color"
              (click)="setColor(color)"
              [matTooltip]="color"
            ></button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .feature-row {
      display: flex;
      align-items: center;
      min-height: 36px;
      gap: 4px;
      padding: 0 4px;
      border-radius: 6px;
      &:hover { background: rgba(255,255,255,0.04); }
    }

    .spinner { flex-shrink: 0; }

    .geo-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      transition: color 0.2s;
    }

    .feature-label {
      flex: 1;
      font-size: 13px;
      min-width: 0;
      color: #c8d0de;
      ::ng-deep .mdc-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 170px;
        display: block;
        color: #c8d0de;
      }
    }

    .count-badge {
      font-size: 10px;
      font-weight: 600;
      background: rgba(91,141,239,0.15);
      color: #82b1ff;
      border-radius: 8px;
      padding: 1px 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      color: #3d4a5c;
      &:hover { color: #82b1ff; }
    }

    .error-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: #ef9a9a;
      padding: 4px 8px 4px 36px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .controls-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px 6px 36px;
    }

    .ctrl-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #3d4a5c;
      flex-shrink: 0;
    }

    .opacity-slider {
      width: 90px;
      flex-shrink: 0;
    }

    .palette {
      display: flex;
      gap: 3px;
      flex-wrap: wrap;
      margin-left: 4px;
    }

    .color-swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1.5px solid transparent;
      cursor: pointer;
      padding: 0;
      transition: transform 0.1s;

      &:hover { transform: scale(1.2); }
      &.selected { border-color: rgba(255,255,255,0.7); transform: scale(1.15); }
    }
  `],
})
export class WfsFeatureItemComponent {
  @Input({ required: true }) ft!: WfsFeatureType;
  @Input({ required: true }) server!: WfsServer;

  wfsService = inject(WfsService);

  loading = signal(false);
  palette = WFS_COLOR_PALETTE;

  get geometryIcon(): string {
    // Heuristic from layer name until DescribeFeatureType is called
    const name = this.ft.name.toLowerCase() + this.ft.title.toLowerCase();
    if (name.includes('point') || name.includes('station') || name.includes('site')) {
      return 'scatter_plot';
    }
    if (name.includes('line') || name.includes('route') || name.includes('road') || name.includes('troncon')) {
      return 'timeline';
    }
    return 'crop_square'; // Default: polygon
  }

  activeLayer() {
    return this.wfsService.getActiveLayer(this.ft.id);
  }

  async toggle(): Promise<void> {
    try {
      await this.wfsService.toggleFeatureType(this.server, this.ft);
    } catch {
      // Error state is already set in the service
    }
  }

  zoomTo(): void {
    this.wfsService.zoomTo(this.ft.id);
  }

  setOpacity(value: number): void {
    this.wfsService.setOpacity(this.ft.id, value);
  }

  setColor(color: string): void {
    this.wfsService.setColor(this.ft.id, color);
  }
}
