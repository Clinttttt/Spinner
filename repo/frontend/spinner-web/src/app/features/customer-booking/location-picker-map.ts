import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import type * as LeafletNamespace from 'leaflet';

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
      <div class="centre-pin" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 22s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      </div>
      <p class="map-hint">Move the map so the pin sits on your pickup point.</p>
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
    `,
  ],
})
export class LocationPickerMap implements AfterViewInit, OnDestroy {
  readonly centre = input.required<MapPoint>();
  readonly ariaLabel = input('Pickup location map');
  /** Emitted when the customer stops moving the map. */
  readonly pointChosen = output<MapPoint>();

  private readonly canvas = viewChild.required<ElementRef<HTMLDivElement>>('canvas');
  private map?: LeafletNamespace.Map;
  private leaflet?: typeof LeafletNamespace;
  /** Suppresses the move event caused by our own programmatic recentre. */
  private applyingExternalCentre = false;

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

  async ngAfterViewInit(): Promise<void> {
    // Loaded lazily so Leaflet stays out of the initial bundle.
    const leaflet = await import('leaflet');
    this.leaflet = leaflet;

    const start = this.centre();
    const map = leaflet.map(this.canvas().nativeElement, {
      attributionControl: true,
      // A rural pickup point needs a street map, not satellite imagery.
      center: [start.latitude, start.longitude],
      zoom: 17,
      zoomControl: true,
    });

    leaflet
      .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      })
      .addTo(map);

    map.on('moveend', () => {
      if (this.applyingExternalCentre) return;
      const centre = map.getCenter();
      this.pointChosen.emit({ latitude: centre.lat, longitude: centre.lng });
    });

    this.map = map;

    // The container is often laid out after creation (inside a collapsed
    // section), which leaves Leaflet with stale dimensions and grey tiles.
    setTimeout(() => map.invalidateSize(), 0);
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
