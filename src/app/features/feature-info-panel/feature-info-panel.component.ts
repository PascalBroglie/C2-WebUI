import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FeatureInfoResult, FeatureInfoService } from '../../core/services/feature-info.service';

@Component({
  selector: 'app-feature-info-panel',
  standalone: true,
  imports: [
    JsonPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    @if (service.loading() || service.results().length > 0) {
      <div class="panel">
        <div class="panel-header">
          <mat-icon class="header-icon">info</mat-icon>
          <span class="header-title">Informations</span>
          <span class="spacer"></span>
          <button mat-icon-button class="close-btn" (click)="service.clear()" matTooltip="Fermer">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        @if (service.loading()) {
          <div class="loading-row">
            <mat-spinner diameter="16" />
            <span>Interrogation des couches…</span>
          </div>
        }

        @for (result of service.results(); track result.layerTitle) {
          <div class="result-block">
            <div class="result-title">{{ result.layerTitle }}</div>
            <div class="result-content">
              @if (result.format === 'json') {
                <pre class="json-pre">{{ formatJson(result.content) }}</pre>
              } @else if (result.format === 'html') {
                <div class="html-content" [innerHTML]="sanitize(result.content)"></div>
              } @else {
                <pre class="text-pre">{{ result.content }}</pre>
              }
            </div>
          </div>
        }

        @if (!service.loading() && service.results().length === 0) {
          <div class="no-result">
            <mat-icon>search_off</mat-icon>
            <span>Aucune entité à cet emplacement</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .panel {
      position: absolute;
      bottom: 40px;
      left: 16px;
      width: 320px;
      max-height: 380px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.22);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 10;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 6px 8px 12px;
      background: #1565c0;
      color: white;
      flex-shrink: 0;
    }

    .header-icon { font-size: 18px; width: 18px; height: 18px; }
    .header-title { font-size: 13px; font-weight: 600; }
    .spacer { flex: 1; }
    .close-btn { color: white; width: 28px; height: 28px; }

    .loading-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      font-size: 13px;
      color: #666;
      flex-shrink: 0;
    }

    .result-block {
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .result-title {
      font-size: 11px;
      font-weight: 700;
      color: #1565c0;
      padding: 6px 12px 2px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .result-content {
      overflow-y: auto;
      max-height: 220px;
    }

    .json-pre, .text-pre {
      margin: 0;
      padding: 6px 12px 10px;
      font-size: 11px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
      color: #333;
      background: #fafafa;
    }

    .html-content {
      padding: 6px 12px 10px;
      font-size: 12px;
      overflow-x: auto;
      ::ng-deep table { border-collapse: collapse; width: 100%; }
      ::ng-deep td, ::ng-deep th { border: 1px solid #e0e0e0; padding: 3px 6px; font-size: 11px; }
      ::ng-deep th { background: #f5f5f5; font-weight: 600; }
    }

    .no-result {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: #999;
      font-size: 13px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
  `],
})
export class FeatureInfoPanelComponent {
  service = inject(FeatureInfoService);
  private sanitizer = inject(DomSanitizer);

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  formatJson(raw: string): string {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
}
