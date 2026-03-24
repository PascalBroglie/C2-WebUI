import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as Cesium from 'cesium';
import { CesiumService } from '../../core/services/cesium.service';

interface SpeedOption {
  label: string;
  multiplier: number;   // Cesium clock multiplier (seconds of sim per real second)
}

const SPEEDS: SpeedOption[] = [
  { label: '1 min/s',  multiplier: 60        },
  { label: '1 h/s',   multiplier: 3_600      },
  { label: '6 h/s',   multiplier: 21_600     },
  { label: '1 j/s',   multiplier: 86_400     },
  { label: '1 sem/s', multiplier: 604_800    },
  { label: '1 mois/s',multiplier: 2_592_000  },
];

@Component({
  selector: 'app-timeline-bar',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  template: `
    <div class="timeline-bar">

      <!-- Coordinates (left) -->
      <div class="coords">
        @if (cs.coordinates(); as c) {
          <span class="coord-item">
            <span class="coord-label">LAT</span>
            {{ c.lat | number:'1.4-4' }}°
          </span>
          <span class="coord-sep">|</span>
          <span class="coord-item">
            <span class="coord-label">LON</span>
            {{ c.lon | number:'1.4-4' }}°
          </span>
          @if (c.alt > 1) {
            <span class="coord-sep">|</span>
            <span class="coord-item">
              <span class="coord-label">ALT</span>
              {{ c.alt | number:'1.0-0' }} m
            </span>
          }
        } @else {
          <span class="coord-hint">Déplacez la souris sur la carte</span>
        }
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Playback controls (center) -->
      <div class="controls">
        <!-- Step back -->
        <button class="ctrl-btn" (click)="stepBack()" matTooltip="Reculer d'un pas">
          <mat-icon>skip_previous</mat-icon>
        </button>

        <!-- Play / Pause -->
        <button class="ctrl-btn play-btn" (click)="togglePlay()" [matTooltip]="playing() ? 'Pause' : 'Lire'">
          <mat-icon>{{ playing() ? 'pause' : 'play_arrow' }}</mat-icon>
        </button>

        <!-- Step forward -->
        <button class="ctrl-btn" (click)="stepForward()" matTooltip="Avancer d'un pas">
          <mat-icon>skip_next</mat-icon>
        </button>

        <!-- Speed select -->
        <mat-select class="speed-select" [(ngModel)]="selectedSpeed" (ngModelChange)="applySpeed()"
          matTooltip="Vitesse de lecture">
          @for (s of speeds; track s.multiplier) {
            <mat-option [value]="s.multiplier">{{ s.label }}</mat-option>
          }
        </mat-select>
      </div>

      <!-- Divider -->
      <div class="divider"></div>

      <!-- Date display + slider (right) -->
      <div class="time-section">
        <span class="date-display">{{ currentDateLabel() }}</span>
        <input
          class="time-slider"
          type="range"
          min="0"
          max="10000"
          step="1"
          [value]="sliderValue()"
          (input)="onSliderInput($event)"
          (mousedown)="pauseForScrub()"
          (mouseup)="resumeAfterScrub()"
          matTooltip="Naviguer dans le temps"
        />
        <!-- Start / End labels -->
        <div class="time-bounds">
          <span>2020</span>
          <span>2030</span>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      position: absolute;
      bottom: 24px;
      left: 16px;
      right: 16px;
      z-index: 10;
      display: block;
    }

    .timeline-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 48px;
      padding: 0 14px;
      background: rgba(18, 21, 32, 0.92);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.55);
      overflow: hidden;
    }

    /* Coordinates */
    .coords {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 260px;
      flex-shrink: 0;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      color: #c8d0de;
    }

    .coord-label {
      font-size: 9px;
      font-weight: 700;
      color: #5a647a;
      letter-spacing: 0.5px;
      margin-right: 2px;
    }

    .coord-sep { color: rgba(255,255,255,0.12); }
    .coord-hint { font-size: 11px; color: #3d4a5c; font-style: italic; }

    /* Divider */
    .divider {
      width: 1px;
      height: 24px;
      background: rgba(255,255,255,0.08);
      flex-shrink: 0;
    }

    /* Controls */
    .controls {
      display: flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }

    .ctrl-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #8892a4;
      cursor: pointer;
      transition: color 0.15s, background 0.15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #e2e6f0; background: rgba(255,255,255,0.07); }
    }

    .play-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(91,141,239,0.15);
      color: #5b8def;
      border: 1px solid rgba(91,141,239,0.3);
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { background: rgba(91,141,239,0.25); color: #82b1ff; }
    }

    .speed-select {
      width: 76px;
      font-size: 11px;
      margin-left: 4px;
    }

    /* Time section */
    .time-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .date-display {
      font-size: 12px;
      font-weight: 600;
      color: #c8d0de;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.3px;
      text-align: center;
    }

    .time-slider {
      width: 100%;
      height: 4px;
      appearance: none;
      -webkit-appearance: none;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      outline: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #5b8def;
        box-shadow: 0 0 6px rgba(91,141,239,0.6);
        cursor: pointer;
        border: 2px solid rgba(18,21,32,0.9);
      }

      &::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #5b8def;
        box-shadow: 0 0 6px rgba(91,141,239,0.6);
        cursor: pointer;
        border: 2px solid rgba(18,21,32,0.9);
      }
    }

    .time-bounds {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #3d4a5c;
      font-variant-numeric: tabular-nums;
    }
  `],
})
export class TimelineBarComponent implements OnInit, OnDestroy {
  cs = inject(CesiumService);

  playing = signal(false);
  sliderValue = signal(0);
  currentDateLabel = signal('');
  selectedSpeed = 3_600; // 1 h/s default

  speeds = SPEEDS;

  private _tickSub: Cesium.Event.RemoveCallback | null = null;
  private _wasPlaying = false;

  private get _clock(): Cesium.Clock | null {
    return this.cs.viewer?.clock ?? null;
  }

  ngOnInit(): void {
    // Wait for viewer to be available (it's set synchronously in CesiumViewerComponent)
    setTimeout(() => this._setupClock(), 0);
  }

  ngOnDestroy(): void {
    this._tickSub?.();
  }

  private _setupClock(): void {
    const clock = this._clock;
    if (!clock) return;

    this.applySpeed();
    this._updateFromClock();

    this._tickSub = clock.onTick.addEventListener((c: Cesium.Clock) => {
      this.playing.set(c.shouldAnimate);
      this._updateFromClock();
    });
  }

  private _updateFromClock(): void {
    const clock = this._clock;
    if (!clock) return;

    const jsDate = Cesium.JulianDate.toDate(clock.currentTime);
    this.currentDateLabel.set(this._formatDate(jsDate));

    const total = Cesium.JulianDate.secondsDifference(clock.stopTime, clock.startTime);
    const elapsed = Cesium.JulianDate.secondsDifference(clock.currentTime, clock.startTime);
    this.sliderValue.set(Math.max(0, Math.min(10000, (elapsed / total) * 10000)));
  }

  private _formatDate(d: Date): string {
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}  ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }

  togglePlay(): void {
    const clock = this._clock;
    if (!clock) return;
    clock.shouldAnimate = !clock.shouldAnimate;
    this.playing.set(clock.shouldAnimate);
  }

  stepBack(): void {
    const clock = this._clock;
    if (!clock) return;
    const step = clock.multiplier * 5;
    Cesium.JulianDate.addSeconds(clock.currentTime, -step, clock.currentTime);
    this._updateFromClock();
  }

  stepForward(): void {
    const clock = this._clock;
    if (!clock) return;
    const step = clock.multiplier * 5;
    Cesium.JulianDate.addSeconds(clock.currentTime, step, clock.currentTime);
    this._updateFromClock();
  }

  applySpeed(): void {
    const clock = this._clock;
    if (!clock) return;
    clock.multiplier = this.selectedSpeed;
  }

  pauseForScrub(): void {
    const clock = this._clock;
    if (!clock) return;
    this._wasPlaying = clock.shouldAnimate;
    clock.shouldAnimate = false;
  }

  resumeAfterScrub(): void {
    const clock = this._clock;
    if (!clock) return;
    clock.shouldAnimate = this._wasPlaying;
  }

  onSliderInput(event: Event): void {
    const clock = this._clock;
    if (!clock) return;
    const val = +(event.target as HTMLInputElement).value;
    const total = Cesium.JulianDate.secondsDifference(clock.stopTime, clock.startTime);
    const newTime = clock.startTime.clone();
    Cesium.JulianDate.addSeconds(newTime, (val / 10000) * total, newTime);
    clock.currentTime = newTime;
    this._updateFromClock();
  }
}
