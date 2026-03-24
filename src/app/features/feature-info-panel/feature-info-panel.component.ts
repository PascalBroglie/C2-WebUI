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
      bottom: 86px;    /* above timeline bar (24px + 48px + 14px gap) */
      left: 16px;
      width: 320px;
      max-height: 380px;
      background: rgba(18, 21, 32, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 10;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 8px 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }

    .header-icon { font-size: 16px; width: 16px; height: 16px; color: #5b8def; }
    .header-title { font-size: 13px; font-weight: 600; color: #e2e6f0; }
    .spacer { flex: 1; }
    .close-btn { color: #5a647a; width: 28px; height: 28px; &:hover { color: #e2e6f0; } }

    .loading-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      font-size: 13px;
      color: #8892a4;
      flex-shrink: 0;
    }

    .result-block {
      border-top: 1px solid rgba(255,255,255,0.06);
      flex-shrink: 0;
    }

    .result-title {
      font-size: 10px;
      font-weight: 700;
      color: #5b8def;
      padding: 6px 14px 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .result-content {
      overflow-y: auto;
      max-height: 220px;
    }

    .json-pre, .text-pre {
      margin: 0;
      padding: 6px 14px 10px;
      font-size: 11px;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-break: break-all;
      color: #a8b4c8;
      background: rgba(0,0,0,0.2);
    }

    .html-content {
      padding: 6px 14px 10px;
      font-size: 12px;
      color: #c8d0de;
      overflow-x: auto;
      ::ng-deep table { border-collapse: collapse; width: 100%; }
      ::ng-deep td, ::ng-deep th { border: 1px solid rgba(255,255,255,0.1); padding: 3px 6px; font-size: 11px; }
      ::ng-deep th { background: rgba(255,255,255,0.05); font-weight: 600; color: #e2e6f0; }
    }

    .no-result {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: #3d4a5c;
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
