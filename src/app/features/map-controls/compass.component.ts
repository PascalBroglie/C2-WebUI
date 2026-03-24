import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CesiumService } from '../../core/services/cesium.service';

@Component({
  selector: 'app-compass',
  standalone: true,
  imports: [DecimalPipe, MatTooltipModule],
  template: `
    <button
      class="compass-btn"
      (click)="cs.resetNorth()"
      [matTooltip]="headingLabel()"
      matTooltipPosition="left"
      [class.north-up]="cs.heading() < 1 || cs.heading() > 359"
    >
      <!-- Outer ring -->
      <svg class="ring-svg" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="30" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
        <!-- Cardinal ticks -->
        <line x1="32" y1="4"  x2="32" y2="10" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
        <line x1="60" y1="32" x2="54" y2="32" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <line x1="32" y1="60" x2="32" y2="54" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <line x1="4"  y1="32" x2="10" y2="32" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
      </svg>

      <!-- Rotating needle wrapper: rotates so red N points to true North -->
      <div class="needle-wrap" [style.transform]="'rotate(' + (-cs.heading()) + 'deg)'">
        <div class="needle-n"></div>
        <div class="needle-center"></div>
        <div class="needle-s"></div>
        <span class="label-n">N</span>
      </div>

      <!-- Fixed heading readout -->
      <span class="heading-text">{{ cs.heading() | number:'1.0-0' }}°</span>
    </button>
  `,
  styles: [`
    :host {
      display: block;
      position: absolute;
      bottom: 86px;
      right: 16px;
      z-index: 10;
    }

    .compass-btn {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(18, 21, 32, 0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 4px 20px rgba(0,0,0,0.55);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 0;
      transition: box-shadow 0.2s, border-color 0.3s;

      &:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.7); border-color: rgba(255,255,255,0.2); }
      &.north-up .needle-n { filter: drop-shadow(0 0 3px #ef5350); }
    }

    .ring-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }

    .needle-wrap {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 10px;
      height: 38px;
      margin-top: -19px;
      margin-left: -5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.12s ease-out;
    }

    .needle-n {
      flex: 1;
      width: 10px;
      background: linear-gradient(to bottom, #ef5350, #b71c1c);
      border-radius: 5px 5px 0 0;
      clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
    }

    .needle-center {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #c8d0de;
      flex-shrink: 0;
      z-index: 1;
    }

    .needle-s {
      flex: 1;
      width: 10px;
      background: linear-gradient(to top, #5a647a, #3d4a5c);
      border-radius: 0 0 5px 5px;
      clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
    }

    .label-n {
      position: absolute;
      top: -1px;
      font-size: 9px;
      font-weight: 800;
      color: #ef5350;
      letter-spacing: 0;
      line-height: 1;
      /* counter-rotate so label stays readable */
      transform: rotate(calc(var(--heading, 0) * 1deg));
    }

    .heading-text {
      position: absolute;
      bottom: 6px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-weight: 600;
      color: #5a647a;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
  `],
})
export class CompassComponent {
  cs = inject(CesiumService);

  headingLabel(): string {
    const h = Math.round(this.cs.heading());
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const dir = dirs[Math.round(h / 45) % 8];
    return `${h}° ${dir} — Cliquer pour orienter au nord`;
  }
}
