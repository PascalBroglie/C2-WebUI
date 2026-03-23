import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { WmtsServerConfigBuilder } from '../../../core/builders/wmts-server-config.builder';
import { WmtsServerConfig } from '../../../core/models/wmts.model';

const WMTS_PRESETS: { name: string; url: string }[] = [
  { name: 'IGN Géoportail – WMTS', url: 'https://data.geopf.fr/wmts' },
  { name: 'GeoServer OSM public', url: 'https://ows.terrestris.de/osm/service' },
  { name: 'NASA GIBS – Global Imagery', url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi' },
];

@Component({
  selector: 'app-add-wmts-server-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Ajouter un serveur WMTS</h2>

    <mat-dialog-content>
      <p class="hint">
        Le service doit implémenter OGC WMTS 1.0.0.
        Les tuiles sont demandées via <code>GetTile</code> (REST ou KVP).
      </p>

      <p class="section-label">Serveurs de démonstration</p>
      <mat-list>
        @for (preset of presets; track preset.url) {
          <mat-list-item class="preset-item" (click)="url = preset.url">
            <mat-icon matListItemIcon>grid_view</mat-icon>
            <span matListItemTitle>{{ preset.name }}</span>
            <span matListItemLine class="url-line">{{ preset.url }}</span>
          </mat-list-item>
        }
      </mat-list>

      <mat-divider class="divider" />

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service WMTS</mat-label>
        <input matInput [(ngModel)]="url" placeholder="https://example.com/wmts"
          (keyup.enter)="confirm()" />
      </mat-form-field>

      <!-- Advanced options via builder -->
      <mat-expansion-panel class="advanced-panel">
        <mat-expansion-panel-header>
          <mat-panel-title>Options avancées</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="advanced-grid">
          <mat-form-field appearance="outline">
            <mat-label>Format d'image préféré</mat-label>
            <mat-select [(ngModel)]="preferredFormat">
              <mat-option value="image/png">image/png</mat-option>
              <mat-option value="image/jpeg">image/jpeg</mat-option>
              <mat-option value="image/webp">image/webp</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Encodage des requêtes</mat-label>
            <mat-select [(ngModel)]="requestEncoding">
              <mat-option value="">Auto</mat-option>
              <mat-option value="REST">REST (ResourceURL)</mat-option>
              <mat-option value="KVP">KVP (paramètres URL)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>TileMatrixSet préféré (optionnel)</mat-label>
            <input matInput [(ngModel)]="preferredTileMatrixSet"
              placeholder="GoogleMapsCompatible, PM, EPSG:4326…" />
            <mat-hint>Laissez vide pour la sélection automatique</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Proxy CORS (optionnel)</mat-label>
            <input matInput [(ngModel)]="proxy" placeholder="https://my-proxy.example.com" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Timeout (ms)</mat-label>
            <input matInput type="number" [(ngModel)]="timeout" min="5000" max="120000" step="5000" />
          </mat-form-field>
        </div>
      </mat-expansion-panel>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button mat-flat-button color="primary" [disabled]="!url.trim()" (click)="confirm()">
        Charger les couches
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 500px; display: flex; flex-direction: column; gap: 8px; }
    .hint { font-size: 12px; color: #666; background: #f5f5f5; border-radius: 6px; padding: 8px 12px; margin: 0; code { font-family: monospace; background: #e0e0e0; padding: 1px 4px; border-radius: 3px; } }
    .section-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.6px; margin: 8px 0 4px; }
    .preset-item { cursor: pointer; border-radius: 6px; &:hover { background: rgba(0,0,0,0.04); } }
    .url-line { font-size: 11px; color: #999; }
    .divider { margin: 12px 0; }
    .full-width { width: 100%; }
    .advanced-panel { margin-top: 4px; box-shadow: none !important; border: 1px solid #e0e0e0; border-radius: 8px !important; }
    .advanced-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding-top: 8px; }
    .span-2 { grid-column: span 2; }
  `],
})
export class AddWmtsServerDialogComponent {
  dialogRef = inject(MatDialogRef<AddWmtsServerDialogComponent>);

  presets = WMTS_PRESETS;

  url = '';
  preferredFormat = 'image/png';
  preferredTileMatrixSet = '';
  requestEncoding: '' | 'KVP' | 'REST' = '';
  proxy = '';
  timeout = 30_000;

  confirm(): void {
    if (!this.url.trim()) return;

    const builder = new WmtsServerConfigBuilder()
      .withUrl(this.url)
      .withPreferredFormat(this.preferredFormat)
      .withTimeout(this.timeout);

    if (this.preferredTileMatrixSet.trim()) {
      builder.withPreferredTileMatrixSet(this.preferredTileMatrixSet.trim());
    }
    if (this.requestEncoding) {
      builder.withRequestEncoding(this.requestEncoding);
    }
    if (this.proxy.trim()) {
      builder.withProxy(this.proxy.trim());
    }

    let config: WmtsServerConfig;
    try {
      config = builder.build();
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    this.dialogRef.close(config);
  }
}
