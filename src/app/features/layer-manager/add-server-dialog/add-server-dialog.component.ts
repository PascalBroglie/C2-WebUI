import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const WMS_PRESETS = [
  {
    name: 'BRGM GeoServices',
    url: 'https://geoservices.brgm.fr/geologie',
  },
  {
    name: 'IGN Géoportail (ortho)',
    url: 'https://data.geopf.fr/wms-r/wms',
  },
  {
    name: 'NASA GIBS (MODIS Terra)',
    url: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi',
  },
];

@Component({
  selector: 'app-add-server-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Ajouter un serveur WMS</h2>

    <mat-dialog-content>
      <p class="section-label">Serveurs de démonstration</p>
      <mat-list>
        @for (preset of presets; track preset.url) {
          <mat-list-item
            class="preset-item"
            (click)="selectPreset(preset.url)"
          >
            <mat-icon matListItemIcon>public</mat-icon>
            <span matListItemTitle>{{ preset.name }}</span>
            <span matListItemLine class="url-line">{{ preset.url }}</span>
          </mat-list-item>
        }
      </mat-list>

      <mat-divider class="divider" />

      <p class="section-label">URL personnalisée</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service WMS</mat-label>
        <input
          matInput
          [(ngModel)]="url"
          placeholder="https://example.com/wms"
          (keyup.enter)="confirm()"
        />
        <mat-hint>
          Le service doit supporter WMS 1.3.0 ou 1.1.1 et autoriser les requêtes
          CORS depuis le navigateur.
        </mat-hint>
      </mat-form-field>

      @if (error()) {
        <div class="error-box">
          <mat-icon>error_outline</mat-icon>
          <span>{{ error() }}</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="!url.trim()"
        (click)="confirm()"
      >
        Charger les couches
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 12px 0 4px;
    }

    .preset-item {
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s;
      &:hover { background: rgba(0, 0, 0, 0.04); }
    }

    .url-line {
      font-size: 11px;
      color: #999;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .divider { margin: 12px 0 4px; }

    .full-width { width: 100%; }

    .error-box {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #c62828;
      font-size: 13px;
      background: #ffebee;
      border-radius: 6px;
      padding: 8px 12px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `],
})
export class AddServerDialogComponent {
  dialogRef = inject(MatDialogRef<AddServerDialogComponent>);

  presets = WMS_PRESETS;
  url = '';
  error = signal<string | null>(null);

  selectPreset(url: string): void {
    this.url = url;
  }

  confirm(): void {
    const trimmed = this.url.trim();
    if (!trimmed) return;
    this.dialogRef.close(trimmed);
  }
}
