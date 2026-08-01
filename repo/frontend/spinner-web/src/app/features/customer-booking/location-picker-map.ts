import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as leaflet from 'leaflet';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

/**
 * A compact map whose pin stays fixed at the centre while the customer drags the
 * map underneath it.
 *
 * This exists because address search cannot solve rural Philippine addresses. A
 * geocoder knows the barangay's school or waiting shed, never "Purok 3, third
 * house past the blue gate". Letting the customer place the point themselves is
 * the only reliable way to get coordinates a rider can navigate to.
 *
 * Tiles come from OpenStreetMap: no API key, no billing. Swapping in Google Maps
 * later only changes the tile layer and the geocoder.
 */
@Component({
  selector: 'app-location-picker-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-shell">
      <div class="map-canvas" #canvas role="application" [attr.aria-label]="ariaLabel()"></div>
      @if (!failed()) {
        <div class="centre-pin" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 22s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.6" />
          </svg>
        </div>
      }
      @if (failed()) {
        <p class="map-fallback" role="status">
          The map could not load here. Type your address and landmark instead, or
          use "Use my current location".
        </p>
      } @else if (tilesFailed()) {
        <p class="map-fallback" role="status">
          Map images are not loading on this connection. The pin still records
          your location.
        </p>
      } @else {
        <p class="map-hint">Move the map so the pin sits on your pickup point.</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .map-shell {
        border: 1px solid #dfe4ea;
        border-radius: 16px;
        overflow: hidden;
        position: relative;
      }

      .map-canvas {
        height: 244px;
        width: 100%;
        z-index: 0;
      }

      /* The pin is a static overlay, not a Leaflet marker: the point the
         customer chooses is always the map centre. */
      .centre-pin {
        left: 50%;
        pointer-events: none;
        position: absolute;
        top: 50%;
        transform: translate(-50%, -100%);
        z-index: 2;
      }

      .centre-pin svg {
        fill: none;
        filter: drop-shadow(0 2px 3px rgba(8, 35, 71, 0.35));
        height: 40px;
        stroke: #0d2a52;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
        width: 40px;
      }

      .centre-pin svg path {
        fill: #ffffff;
      }

      .centre-pin svg circle {
        fill: #c98a00;
        stroke: none;
      }

      .map-hint {
        background: rgba(255, 255, 255, 0.94);
        border-top: 1px solid #eef1f4;
        color: #667085;
        font-size: 11px;
        line-height: 1.4;
        margin: 0;
        padding: 8px 10px;
        position: relative;
        text-align: center;
        z-index: 2;
      }

      .map-fallback {
        background: #fff6dd;
        border-top: 1px solid #f2d38b;
        color: #7a5200;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.45;
        margin: 0;
        padding: 10px 12px;
        position: relative;
        text-align: center;
        z-index: 2;
      }
    `,
  ],
})
export class LocationPickerMap implements AfterViewInit, OnDestroy {
  readonly centre = input.required<MapPoint>();
  readonly ariaLabel = input('Pickup location map');
  /** Emitted when the customer stops moving the map. */
  readonly pointChosen = output<MapPoint>();

  /** Leaflet itself could not be loaded or initialised. */
  protected readonly failed = signal(false);
  /** Leaflet works but the tile server is unreachable. */
  protected readonly tilesFailed = signal(false);

  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private map?: leaflet.Map;
  /** Suppresses the move event caused by our own programmatic recentre. */
  private applyingExternalCentre = false;
  /** True once the customer has actually dragged or zoomed the map. */
  private userHasMoved = false;

  constructor() {
    effect(() => {
      const next = this.centre();
      const map = this.map;
      if (!map) return;

      const current = map.getCenter();
      if (this.isSamePoint(current.lat, current.lng, next)) return;

      this.applyingExternalCentre = true;
      map.setView([next.latitude, next.longitude], Math.max(map.getZoom(), 17), {
        animate: false,
      });
      this.applyingExternalCentre = false;
    });
  }

  ngAfterViewInit(): void {
    try {
      // Statically imported on purpose. Leaflet is CommonJS, and a dynamic
      // import resolved to `{ default: namespace }` under this bundler, so
      // calling `.map()` on the namespace threw and the map silently rendered
      // as a blank white box.
      const start = this.centre();
      const map = leaflet.map(this.canvas().nativeElement, {
        attributionControl: true,
        center: [start.latitude, start.longitude],
        zoom: 17,
        zoomControl: true,
      });

      const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      });

      // A blocked or offline tile server must say so rather than look empty.
      tiles.on('tileerror', () => this.tilesFailed.set(true));
      tiles.on('load', () => this.tilesFailed.set(false));
      tiles.addTo(map);

      map.on('moveend', () => {
        if (this.applyingExternalCentre) return;
        // Leaflet also fires moveend for programmatic recentres and for the
        // invalidateSize() calls below. Only a real gesture counts, otherwise
        // the customer gets a pin at the default centre they never chose.
        if (!this.userHasMoved) return;
        const centre = map.getCenter();
        this.pointChosen.emit({ latitude: centre.lat, longitude: centre.lng });
      });

      const markMoved = () => {
        if (!this.applyingExternalCentre) this.userHasMoved = true;
      };
      map.on('dragstart', markMoved);
      map.on('zoomstart', markMoved);

      this.map = map;

      // The container is frequently measured before layout settles, which
      // leaves Leaflet with stale dimensions and no tiles.
      setTimeout(() => map.invalidateSize(), 0);
      setTimeout(() => map.invalidateSize(), 350);
    } catch {
      this.failed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  private isSamePoint(latitude: number, longitude: number, point: MapPoint): boolean {
    return (
      Math.abs(latitude - point.latitude) < 0.000005 &&
      Math.abs(longitude - point.longitude) < 0.000005
    );
  }
}
