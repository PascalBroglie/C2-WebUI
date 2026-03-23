import { Component } from '@angular/core';
import { CesiumViewerComponent } from './features/cesium-viewer/cesium-viewer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CesiumViewerComponent],
  template: `<app-cesium-viewer />`,
  styles: [`
    :host { display: block; width: 100vw; height: 100vh; }
  `],
})
export class App {}
