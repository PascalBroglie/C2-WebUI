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
import { WfsServerConfigBuilder } from '../../../core/builders/wfs-server-config.builder';
import { WfsServerConfig, WfsVersion } from '../../../core/models/wfs.model';

const WFS_PRESETS: { name: string; url: string }[] = [
  { name: 'BRGM GeoServices – Géologie', url: 'https://geoservices.brgm.fr/geologie' },
  { name: 'IGN Géoportail – Entités admin.', url: 'https://data.geopf.fr/wfs/ows' },
  { name: 'GeoServer OSM public', url: 'https://ows.terrestris.de/geoserver/osm/wfs' },
];

@Component({
  selector: 'app-add-wfs-server-dialog',
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
    <h2 mat-dialog-title>Ajouter un serveur WFS</h2>

    <mat-dialog-content>
      <p class="hint">
        Le service doit implémenter OGC WFS (1.0.0 / 1.1.0 / 2.0.0).
        Les entités sont récupérées via <code>GetFeature</code> au format GeoJSON.
      </p>

      <p class="section-label">Serveurs de démonstration</p>
      <mat-list>
        @for (preset of presets; track preset.url) {
          <mat-list-item class="preset-item" (click)="url = preset.url">
            <mat-icon matListItemIcon>storage</mat-icon>
            <span matListItemTitle>{{ preset.name }}</span>
            <span matListItemLine class="url-line">{{ preset.url }}</span>
          </mat-list-item>
        }
      </mat-list>

      <mat-divider class="divider" />

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service WFS</mat-label>
        <input matInput [(ngModel)]="url" placeholder="https://example.com/wfs"
          (keyup.enter)="confirm()" />
      </mat-form-field>

      <!-- Advanced options via builder -->
      <mat-expansion-panel class="advanced-panel">
        <mat-expansion-panel-header>
          <mat-panel-title>Options avancées</mat-panel-title>
        </mat-expansion-panel-header>

        <div class="advanced-grid">
          <mat-form-field appearance="outline">
            <mat-label>Version préférée</mat-label>
            <mat-select [(ngModel)]="preferredVersion">
              <mat-option value="2.0.0">2.0.0</mat-option>
              <mat-option value="1.1.0">1.1.0</mat-option>
              <mat-option value="1.0.0">1.0.0</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Max entités</mat-label>
            <input matInput type="number" [(ngModel)]="maxFeatures" min="100" max="50000" step="500" />
            <mat-hint>COUNT / MAXFEATURES</mat-hint>
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
        Charger les types d'entités
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
export class AddWfsServerDialogComponent {
  dialogRef = inject(MatDialogRef<AddWfsServerDialogComponent>);

  presets = WFS_PRESETS;

  url = '';
  preferredVersion: WfsVersion = '2.0.0';
  maxFeatures = 2_000;
  proxy = '';
  timeout = 30_000;

  confirm(): void {
    if (!this.url.trim()) return;

    const builder = new WfsServerConfigBuilder()
      .withUrl(this.url)
      .withPreferredVersion(this.preferredVersion)
      .withMaxFeatures(this.maxFeatures)
      .withTimeout(this.timeout);

    if (this.proxy.trim()) builder.withProxy(this.proxy.trim());

    let config: WfsServerConfig;
    try {
      config = builder.build();
    } catch (err: any) {
      console.error(err.message);
      return;
    }

    this.dialogRef.close(config);
  }
}
