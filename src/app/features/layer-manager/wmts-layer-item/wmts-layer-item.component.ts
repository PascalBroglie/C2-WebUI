import { Component, Input, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WmtsLayer, WmtsServer } from '../../../core/models/wmts.model';
import { WmtsService } from '../../../core/services/wmts.service';

@Component({
  selector: 'app-wmts-layer-item',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  template: `
    <div class="layer-row">
      <mat-icon class="layer-icon">grid_view</mat-icon>

      <mat-checkbox
        class="layer-label"
        [checked]="wmtsService.isLayerActive(layer.id)"
        (change)="toggle()"
        [matTooltip]="layer.abstract ?? layer.title"
        matTooltipShowDelay="800"
      >
        {{ layer.title }}
      </mat-checkbox>

      @if (wmtsService.isLayerActive(layer.id)) {
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

    @if (wmtsService.isLayerActive(layer.id)) {
      <div class="controls-row">
        <mat-icon class="ctrl-icon" matTooltip="Opacité">opacity</mat-icon>
        <mat-slider class="opacity-slider" min="0" max="1" step="0.05" discrete>
          <input
            matSliderThumb
            [value]="wmtsService.getActiveLayer(layer.id)?.opacity ?? 1"
            (valueChange)="setOpacity($event)"
          />
        </mat-slider>

        <button
          mat-icon-button
          class="action-btn"
          [class.visible]="wmtsService.getActiveLayer(layer.id)?.visible"
          (click)="toggleVisibility()"
          [matTooltip]="wmtsService.getActiveLayer(layer.id)?.visible ? 'Masquer' : 'Afficher'"
        >
          <mat-icon>{{ wmtsService.getActiveLayer(layer.id)?.visible ? 'visibility' : 'visibility_off' }}</mat-icon>
        </button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .layer-row {
      display: flex;
      align-items: center;
      min-height: 36px;
      gap: 4px;
      padding: 0 4px;
      border-radius: 4px;
      &:hover { background: rgba(0,0,0,0.04); }
    }

    .layer-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: #1565c0;
    }

    .layer-label {
      flex: 1;
      font-size: 13px;
      min-width: 0;
      ::ng-deep .mdc-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 175px;
        display: block;
      }
    }

    .action-btn {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      color: #999;
      &:hover { color: #1565c0; }
      &.visible { color: #1565c0; }
    }

    .controls-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px 6px 28px;
    }

    .ctrl-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #999;
      flex-shrink: 0;
    }

    .opacity-slider {
      width: 100px;
      flex-shrink: 0;
    }
  `],
})
export class WmtsLayerItemComponent {
  @Input({ required: true }) layer!: WmtsLayer;
  @Input({ required: true }) server!: WmtsServer;

  wmtsService = inject(WmtsService);

  toggle(): void {
    this.wmtsService.toggleLayer(this.server, this.layer);
  }

  zoomTo(): void {
    this.wmtsService.zoomTo(this.layer.id);
  }

  setOpacity(value: number): void {
    this.wmtsService.setLayerOpacity(this.layer.id, value);
  }

  toggleVisibility(): void {
    const current = this.wmtsService.getActiveLayer(this.layer.id)?.visible ?? true;
    this.wmtsService.setLayerVisibility(this.layer.id, !current);
  }
}
