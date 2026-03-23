import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

const WFS_PRESETS = [
  {
    name: 'BRGM GeoServices – Géologie',
    url: 'https://geoservices.brgm.fr/geologie',
  },
  {
    name: 'IGN Géoportail – Entités administratives',
    url: 'https://data.geopf.fr/wfs/ows',
  },
  {
    name: 'GeoServer public (OpenStreetMap)',
    url: 'https://ows.terrestris.de/geoserver/osm/wfs',
  },
];

@Component({
  selector: 'app-add-wfs-server-dialog',
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
  ],
  template: `
    <h2 mat-dialog-title>Ajouter un serveur WFS</h2>

    <mat-dialog-content>
      <p class="hint">
        Le service doit implémenter le standard OGC WFS (1.0.0 / 1.1.0 / 2.0.0)
        et exposer un endpoint <code>GetCapabilities</code>.
        Les entités sont récupérées au format GeoJSON via <code>GetFeature</code>.
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

      <p class="section-label">URL personnalisée</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service WFS</mat-label>
        <input
          matInput
          [(ngModel)]="url"
          placeholder="https://example.com/wfs"
          (keyup.enter)="confirm()"
        />
        <mat-hint>
          Les paramètres SERVICE, VERSION et REQUEST seront ajoutés automatiquement.
        </mat-hint>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Annuler</button>
      <button
        mat-flat-button
        color="primary"
        [disabled]="!url.trim()"
        (click)="confirm()"
      >
        Charger les types d'entités
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
    .hint {
      font-size: 12px;
      color: #666;
      background: #f5f5f5;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 0;
      line-height: 1.6;
      code { font-family: monospace; background: #e0e0e0; padding: 1px 4px; border-radius: 3px; }
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
      &:hover { background: rgba(0,0,0,0.04); }
    }
    .url-line { font-size: 11px; color: #999; }
    .divider { margin: 12px 0 4px; }
    .full-width { width: 100%; }
  `],
})
export class AddWfsServerDialogComponent {
  dialogRef = inject(MatDialogRef<AddWfsServerDialogComponent>);
  presets = WFS_PRESETS;
  url = '';

  confirm(): void {
    const trimmed = this.url.trim();
    if (!trimmed) return;
    this.dialogRef.close(trimmed);
  }
}
