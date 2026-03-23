import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { DEFAULT_TERRAIN_PROVIDERS, TerrainProviderConfig } from '../../core/models/terrain.model';

@Component({
  selector: 'app-terrain-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatListModule,
    MatIconModule,
    MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>Connexion au service de terrain (Quantized-Mesh)</h2>

    <mat-dialog-content>
      <!-- Presets -->
      <p class="section-label">Serveurs prédéfinis</p>
      <mat-list>
        @for (preset of presets; track preset.url) {
          <mat-list-item (click)="selectPreset(preset)" class="preset-item">
            <mat-icon matListItemIcon>terrain</mat-icon>
            <span matListItemTitle>{{ preset.name }}</span>
            <span matListItemLine>{{ preset.url }}</span>
          </mat-list-item>
        }
      </mat-list>

      <mat-divider class="divider" />

      <!-- Custom URL -->
      <p class="section-label">URL personnalisée</p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL du service quantized-mesh</mat-label>
        <input matInput [(ngModel)]="config().url" placeholder="https://terrain.example.com/tilesets/terrain" />
        <mat-hint>Le serveur doit exposer un fichier layer.json à la racine</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom affiché</mat-label>
        <input matInput [(ngModel)]="config().name" placeholder="Mon terrain" />
      </mat-form-field>

      <div class="options-row">
        <mat-checkbox [(ngModel)]="config().requestVertexNormals">
          Normales de vertex (ombrage)
        </mat-checkbox>
        <mat-checkbox [(ngModel)]="config().requestWaterMask">
          Masque eau
        </mat-checkbox>
      </div>

      @if (error()) {
        <p class="error-msg">{{ error() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Annuler</button>
      <button mat-flat-button color="primary" (click)="confirm()" [disabled]="!config().url">
        Connecter
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 480px; display: flex; flex-direction: column; gap: 8px; }
    .section-label { font-size: 12px; font-weight: 500; color: #666; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .preset-item { cursor: pointer; border-radius: 4px; &:hover { background: rgba(0,0,0,0.04); } }
    .divider { margin: 16px 0; }
    .full-width { width: 100%; }
    .options-row { display: flex; gap: 24px; }
    .error-msg { color: #f44336; font-size: 12px; }
  `],
})
export class TerrainDialogComponent {
  dialogRef = inject(MatDialogRef<TerrainDialogComponent>);

  presets = DEFAULT_TERRAIN_PROVIDERS;
  config = signal<TerrainProviderConfig>({ name: '', url: '', requestVertexNormals: true, requestWaterMask: false });
  error = signal<string | null>(null);

  selectPreset(preset: TerrainProviderConfig): void {
    this.config.set({ ...preset });
  }

  confirm(): void {
    const cfg = this.config();
    if (!cfg.url) return;
    this.dialogRef.close(cfg);
  }
}
