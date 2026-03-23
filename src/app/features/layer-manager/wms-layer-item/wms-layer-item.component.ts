import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { WmsLayer, WmsServer } from '../../../core/models/wms.model';
import { WmsService } from '../../../core/services/wms.service';

@Component({
  selector: 'app-wms-layer-item',
  standalone: true,
  // Self-import enables recursive rendering for nested layer groups
  imports: [
    WmsLayerItemComponent,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  template: `
    <div class="layer-row" [style.padding-left.px]="depth * 16">
      <!-- Group toggle (only for layers with children) -->
      @if (layer.children.length > 0) {
        <button mat-icon-button class="expand-btn" (click)="expanded.set(!expanded())">
          <mat-icon>{{ expanded() ? 'expand_more' : 'chevron_right' }}</mat-icon>
        </button>
      } @else {
        <span class="expand-placeholder"></span>
      }

      <!-- Layer icon -->
      <mat-icon class="layer-icon">
        {{ layer.name ? 'layers' : 'folder' }}
      </mat-icon>

      <!-- Checkbox (only for named, activatable layers) -->
      @if (layer.name) {
        <mat-checkbox
          class="layer-label"
          [checked]="wmsService.isLayerActive(layer.id)"
          (change)="toggle()"
          [matTooltip]="layer.abstract ?? ''"
          matTooltipShowDelay="800"
        >
          {{ layer.title }}
        </mat-checkbox>
      } @else {
        <span class="group-label">{{ layer.title }}</span>
      }
    </div>

    <!-- Opacity slider (shown when layer is active) -->
    @if (layer.name && wmsService.isLayerActive(layer.id)) {
      <div class="opacity-row" [style.padding-left.px]="depth * 16 + 72">
        <mat-icon class="opacity-icon">opacity</mat-icon>
        <mat-slider class="opacity-slider" min="0" max="1" step="0.05" discrete>
          <input
            matSliderThumb
            [value]="wmsService.getActiveLayer(layer.id)?.opacity ?? 1"
            (valueChange)="setOpacity($event)"
          />
        </mat-slider>
      </div>
    }

    <!-- Recursive children -->
    @if (expanded() && layer.children.length > 0) {
      @for (child of layer.children; track child.id) {
        <app-wms-layer-item
          [layer]="child"
          [server]="server"
          [depth]="depth + 1"
        />
      }
    }
  `,
  styles: [`
    :host { display: block; }

    .layer-row {
      display: flex;
      align-items: center;
      min-height: 36px;
      gap: 2px;

      &:hover { background: rgba(0, 0, 0, 0.04); border-radius: 4px; }
    }

    .expand-btn { width: 28px; height: 28px; flex-shrink: 0; }
    .expand-placeholder { width: 28px; flex-shrink: 0; }

    .layer-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: #666;
    }

    .layer-label {
      font-size: 13px;
      flex: 1;
      overflow: hidden;

      ::ng-deep .mdc-label {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
        display: block;
      }
    }

    .group-label {
      font-size: 12px;
      font-weight: 600;
      color: #444;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .opacity-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-bottom: 4px;
    }

    .opacity-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #999;
    }

    .opacity-slider {
      flex: 1;
      max-width: 160px;
    }
  `],
})
export class WmsLayerItemComponent implements OnInit {
  @Input({ required: true }) layer!: WmsLayer;
  @Input({ required: true }) server!: WmsServer;
  @Input() depth = 0;

  wmsService = inject(WmsService);

  expanded = signal(false);

  ngOnInit(): void {
    // Auto-expand group layers at depth 0
    this.expanded.set(this.depth === 0 && this.layer.children.length > 0);
  }

  toggle(): void {
    this.wmsService.toggleLayer(this.server, this.layer);
  }

  setOpacity(value: number): void {
    this.wmsService.setLayerOpacity(this.layer.id, value);
  }
}
