import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AddressLookupService } from './address-lookup.service';

function photonFeature(overrides: Record<string, unknown> = {}) {
  return {
    geometry: { coordinates: [126.0077332, 9.2229286] },
    properties: {
      city: 'Carmen',
      country: 'Philippines',
      countrycode: 'PH',
      name: 'San Vicente Elementary School',
      osm_id: 12345,
      osm_type: 'N',
      state: 'Surigao del Sur',
      suburb: 'San Vicente',
      ...overrides,
    },
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

  it('skips lookups for very short input', async () => {
    const results = await firstValueFrom(service.search('sa'));

    expect(results).toEqual([]);
    http.expectNone(() => true);
  });

  it('maps a geocoder hit into an address suggestion with coordinates', async () => {
    const pending = firstValueFrom(service.search('San Vicente Carmen'));
    const request = http.expectOne((candidate) => candidate.url.includes('/api?'));
    request.flush({ features: [photonFeature()] });

    const [suggestion] = await pending;

    expect(suggestion.latitude).toBe(9.2229286);
    expect(suggestion.longitude).toBe(126.0077332);
    expect(suggestion.barangay).toBe('San Vicente');
    expect(suggestion.cityOrMunicipality).toBe('Carmen');
    expect(suggestion.placeId).toBe('N12345');
    expect(suggestion.formattedAddress).toContain('San Vicente Elementary School');
    expect(suggestion.formattedAddress).toContain('Surigao del Sur');
  });

  it('drops results outside the Philippines', async () => {
    const pending = firstValueFrom(service.search('San Vicente'));
    const request = http.expectOne((candidate) => candidate.url.includes('/api?'));
    request.flush({
      features: [photonFeature({ countrycode: 'US', country: 'United States' })],
    });

    expect(await pending).toEqual([]);
  });

  it('never blocks the booking form when the geocoder fails', async () => {
    const pending = firstValueFrom(service.search('San Vicente'));
    const request = http.expectOne((candidate) => candidate.url.includes('/api?'));
    request.error(new ProgressEvent('network error'));

    expect(await pending).toEqual([]);
  });

  it('reverse geocodes captured coordinates', async () => {
    const pending = firstValueFrom(service.reverse(9.2229286, 126.0077332));
    const request = http.expectOne((candidate) => candidate.url.includes('/reverse?'));
    request.flush({ features: [photonFeature()] });

    const result = await pending;

    expect(result?.cityOrMunicipality).toBe('Carmen');
  });

  it('returns nothing when reverse geocoding fails', async () => {
    const pending = firstValueFrom(service.reverse(9, 126));
    const request = http.expectOne((candidate) => candidate.url.includes('/reverse?'));
    request.error(new ProgressEvent('network error'));

    expect(await pending).toBeNull();
  });
});
