import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AddressLookupService, type GeoBias } from './address-lookup.service';

/** Roughly the shop in San Vicente, Madrid, Surigao del Sur. */
const BIAS: GeoBias = { latitude: 9.2381784, longitude: 125.9624521, radiusKm: 15 };

function photonFeature(
  name: string,
  latitude: number,
  longitude: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    geometry: { coordinates: [longitude, latitude] },
    properties: {
      city: 'Madrid',
      country: 'Philippines',
      countrycode: 'PH',
      name,
      osm_id: 1,
      osm_type: 'N',
      state: 'Surigao del Sur',
      ...overrides,
    },
  };
}

function nominatimPlace(name: string, latitude: number, longitude: number) {
  return {
    address: { county: 'Carmen', state: 'Surigao del Sur', suburb: name },
    display_name: `${name}, Surigao del Sur, Caraga, Philippines`,
    lat: String(latitude),
    lon: String(longitude),
    name,
    osm_id: 42,
    osm_type: 'relation',
  };
}

describe('AddressLookupService', () => {
  let service: AddressLookupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AddressLookupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function photonRequest() {
    return http.expectOne((request) => request.url.includes('/api?'));
  }

  function nominatimRequest() {
    return http.expectOne((request) => request.url.includes('/search?'));
  }

  it('skips lookups for very short input', async () => {
    expect(await firstValueFrom(service.search('sa', BIAS))).toEqual([]);
    http.expectNone(() => true);
  });

  it('maps a hit into a suggestion with coordinates and distance', async () => {
    const pending = firstValueFrom(service.search('San Vicente Elementary', BIAS));
    photonRequest().flush({
      features: [
        photonFeature('San Vicente Elementary School', 9.2229286, 126.0077332),
        photonFeature('A', 9.24, 125.96),
        photonFeature('B', 9.25, 125.97),
        photonFeature('C', 9.26, 125.98),
      ],
    });

    const results = await pending;
    const school = results.find((item) => item.primaryText.includes('Elementary'))!;
    expect(school.latitude).toBe(9.2229286);
    expect(school.longitude).toBe(126.0077332);
    expect(school.distanceKm).toBeGreaterThan(0);
    expect(school.formattedAddress).toContain('Surigao del Sur');
  });

  it('asks the bounded provider when the first returns few results', async () => {
    const pending = firstValueFrom(service.search('San Vicente Carmen', BIAS));

    // Photon only knows the school, several kilometres away.
    photonRequest().flush({
      features: [photonFeature('San Vicente Elementary School', 9.2229286, 126.0077332)],
    });

    // The bounded query resolves the barangay itself, much closer.
    const bounded = nominatimRequest();
    expect(bounded.request.urlWithParams).toContain('bounded=1');
    expect(bounded.request.urlWithParams).toContain('viewbox=');
    bounded.flush([nominatimPlace('San Vicente', 9.2374, 125.9616)]);

    const results = await pending;
    expect(results.length).toBe(2);
    // Nearest first: the barangay outranks the distant school.
    expect(results[0].primaryText).toBe('San Vicente');
    expect(results[0].distanceKm!).toBeLessThan(results[1].distanceKm!);
  });

  it('does not call the bounded provider when results are already plentiful', async () => {
    const pending = firstValueFrom(service.search('San Vicente', BIAS));
    photonRequest().flush({
      features: [
        photonFeature('One', 9.24, 125.96),
        photonFeature('Two', 9.25, 125.97),
        photonFeature('Three', 9.26, 125.98),
        photonFeature('Four', 9.27, 125.99),
      ],
    });

    expect((await pending).length).toBe(4);
    http.expectNone((request) => request.url.includes('/search?'));
  });

  it('drops results outside the Philippines', async () => {
    const pending = firstValueFrom(service.search('San Vicente', BIAS));
    photonRequest().flush({
      features: [
        photonFeature('Elsewhere', 40.7, -74, { countrycode: 'US', country: 'United States' }),
      ],
    });
    nominatimRequest().flush([]);

    expect(await pending).toEqual([]);
  });

  it('deduplicates the same place reported by both providers', async () => {
    const pending = firstValueFrom(service.search('San Vicente', BIAS));
    photonRequest().flush({ features: [photonFeature('San Vicente', 9.2374, 125.9616)] });
    nominatimRequest().flush([nominatimPlace('San Vicente', 9.2374, 125.9616)]);

    expect((await pending).length).toBe(1);
  });

  it('never blocks the booking form when both lookups fail', async () => {
    const pending = firstValueFrom(service.search('San Vicente', BIAS));
    photonRequest().error(new ProgressEvent('network error'));
    nominatimRequest().error(new ProgressEvent('network error'));

    expect(await pending).toEqual([]);
  });

  it('reverse geocodes captured coordinates', async () => {
    const pending = firstValueFrom(service.reverse(9.2374, 125.9616));
    http
      .expectOne((request) => request.url.includes('/reverse?'))
      .flush({ features: [photonFeature('San Vicente Barangay Hall', 9.2374, 125.9616)] });

    expect((await pending)?.cityOrMunicipality).toBe('Madrid');
  });

  it('returns nothing when reverse geocoding fails', async () => {
    const pending = firstValueFrom(service.reverse(9, 126));
    http
      .expectOne((request) => request.url.includes('/reverse?'))
      .error(new ProgressEvent('network error'));

    expect(await pending).toBeNull();
  });
});
