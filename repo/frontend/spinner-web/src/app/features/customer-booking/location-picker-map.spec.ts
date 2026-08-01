import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LocationPickerMap, type MapPoint } from './location-picker-map';

@Component({
  imports: [LocationPickerMap],
  template: `<app-location-picker-map [centre]="centre()" (pointChosen)="chosen = $event" />`,
})
class HostComponent {
  readonly centre = signal<MapPoint>({ latitude: 9.2381784, longitude: 125.9624521 });
  chosen: MapPoint | null = null;
}

/**
 * The map previously rendered as a blank white box: Leaflet is CommonJS, the
 * dynamic import resolved to `{ default: namespace }`, and calling `.map()` on
 * the wrong object threw silently. These tests instantiate the real library so
 * that interop regression cannot come back unnoticed.
 */
describe('LocationPickerMap', () => {
  it('initialises Leaflet instead of failing silently', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // ngAfterViewInit awaits the dynamic import.
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    // Leaflet stamps this class onto the container once a map is created.
    expect(host.querySelector('.leaflet-container')).not.toBeNull();
    // The failure banner must not be showing.
    expect(host.textContent).not.toContain('The map could not load here');
    // The centre pin and instruction are present.
    expect(host.querySelector('.centre-pin')).not.toBeNull();
    expect(host.textContent).toContain('Move the map so the pin sits');

    fixture.destroy();
  });

  it('creates a tile layer pointing at OpenStreetMap', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.leaflet-tile-pane')).not.toBeNull();

    fixture.destroy();
  });
});
