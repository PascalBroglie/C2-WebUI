import { Component, inject, signal } from '@angular/core';
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
import { WmsServerConfigBuilder } from '../../../core/builders/wms-server-config.builder';
import { WmsServerConfig, WmsVersion } from '../../../core/models/wms.model';

const WMS_PRESETS: { name: string; url: string }[] = [
  { name: 'BRGM GeoServices', url: 'https://geoservices.brgm.fr/geologie' },
  { name: 'IGN Géoportail (ortho)', url: 'https://data.geopf.fr/wms-r/wms' },
  { name: 'NASA GIBS (MODIS Terra)', url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi' },
];

@Component({
  selector: 'app-add-server-dialog',
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
    <h2 mat-dialog-title>Ajouter un serveur WMS</h2>

    <mat-dialog-content>
      <p class="section-label">Serveurs de démonstration</p>
      <mat-list>
        @for (preset of presets; track preset.url) {
          <mat-list-item class="preset-item" (click)="url = preset.url">
            <mat-icon matListItemIcon>public</mat-icon>
            <span matListItemTitle>{{ preset.name }}</span>
            <span matListItemLine class="url-line">{{ preset.url }}</span>
          </mat-list-item>
        }
      </mat-list>

      <mat-divider class="divider" />

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service WMS</mat-label>
        <input matInput [(ngModel)]="url" placeholder="https://example.com/wms"
          (keyup.enter)="confirm()" />
        <mat-hint>Les paramètres SERVICE, VERSION et REQUEST seront ajoutés automatiquement.</mat-hint>
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
              <mat-option value="1.3.0">1.3.0</mat-option>
              <mat-option value="1.1.1">1.1.1</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Format image</mat-label>
            <mat-select [(ngModel)]="preferredFormat">
              <mat-option value="image/png">image/png</mat-option>
              <mat-option value="image/jpeg">image/jpeg</mat-option>
              <mat-option value="image/webp">image/webp</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="span-2">
            <mat-label>Proxy CORS (optionnel)</mat-label>
            <input matInput [(ngModel)]="proxy" placeholder="https://my-proxy.example.com" />
            <mat-hint>URL de base du proxy interposé entre le navigateur et le WMS.</mat-hint>
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
    .section-label { font-size: 11px; font-weight: 600; color: #5a647a; text-transform: uppercase; letter-spacing: 0.6px; margin: 8px 0 4px; }
    .preset-item { cursor: pointer; border-radius: 8px; &:hover { background: rgba(255,255,255,0.05); } }
    .url-line { font-size: 11px; color: #3d4a5c; }
    .divider { margin: 12px 0; }
    .full-width { width: 100%; }
    .advanced-panel { margin-top: 4px; box-shadow: none !important; border: 1px solid rgba(255,255,255,0.08) !important; border-radius: 8px !important; }
    .advanced-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; padding-top: 8px; }
    .span-2 { grid-column: span 2; }
  `],
})
export class AddServerDialogComponent {
  dialogRef = inject(MatDialogRef<AddServerDialogComponent>);

  presets = WMS_PRESETS;

  // Form fields
  url = '';
  preferredVersion: WmsVersion = '1.3.0';
  preferredFormat = 'image/png';
  proxy = '';
  timeout = 30_000;

  confirm(): void {
    if (!this.url.trim()) return;

    const builder = new WmsServerConfigBuilder()
      .withUrl(this.url)
      .withPreferredVersion(this.preferredVersion)
      .withPreferredFormat(this.preferredFormat)
      .withTimeout(this.timeout);

    if (this.proxy.trim()) builder.withProxy(this.proxy.trim());

    let config: WmsServerConfig;
    try {
      config = builder.build();
    } catch (err: any) {
      // Validation error from the builder
      console.error(err.message);
      return;
    }

    this.dialogRef.close(config);
  }
}
