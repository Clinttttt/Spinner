import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, type Observable, of, timeout } from 'rxjs';

declare global {
  interface Window {
    __SPINNER_GEOCODER_URL__?: string;
  }
}

/**
 * Free, key-less OpenStreetMap-backed geocoder built for type-ahead search.
 * Swap it for a paid provider by setting `window.__SPINNER_GEOCODER_URL__` to a
 * host that exposes the same `/api` and `/reverse` contract.
 */
const DEFAULT_GEOCODER_URL = 'https://photon.komoot.io';

/** Biases results towards the shop's service area (Caraga region, PH). */
const SEARCH_BIAS = { latitude: 9.1256, longitude: 125.5183 };

const LOOKUP_TIMEOUT_MS = 6000;
const SUGGESTION_LIMIT = 6;

export interface AddressSuggestion {
  barangay: string | null;
  cityOrMunicipality: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  /** Short leading text used as the visible suggestion title. */
  primaryText: string;
  /** Remaining administrative context. */
  secondaryText: string;
}

interface PhotonProperties {
  city?: string;
  count?: number;
  countrycode?: string;
  country?: string;
  county?: string;
  district?: string;
  housenumber?: string;
  locality?: string;
  name?: string;
  osm_id?: number | string;
  osm_type?: string;
  postcode?: string;
  state?: string;
  street?: string;
  suburb?: string;
  type?: string;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function resolveGeocoderUrl(): string {
  const configured = window.__SPINNER_GEOCODER_URL__?.trim();
  return (configured || DEFAULT_GEOCODER_URL).replace(/\/+$/, '');
}

function unique(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = value?.trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    result.push(text);
  }

  return result;
}

function toSuggestion(feature: PhotonFeature): AddressSuggestion | null {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!coordinates || coordinates.length < 2 || !properties) return null;

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const street = unique([
    properties.housenumber && properties.street
      ? `${properties.housenumber} ${properties.street}`
      : properties.street,
  ])[0];
  const barangay = properties.suburb ?? properties.locality ?? properties.district ?? null;
  const cityOrMunicipality = properties.city ?? properties.county ?? null;

  const primaryParts = unique([properties.name, street]);
  const secondaryParts = unique([
    barangay,
    cityOrMunicipality,
    properties.state,
    properties.country,
  ]);

  const primaryText = primaryParts.join(' · ') || secondaryParts[0] || 'Unnamed location';
  const secondaryText = secondaryParts.join(', ');

  return {
    barangay,
    cityOrMunicipality,
    formattedAddress: unique([...primaryParts, ...secondaryParts]).join(', '),
    latitude,
    longitude,
    placeId:
      properties.osm_type && properties.osm_id !== undefined
        ? `${properties.osm_type}${properties.osm_id}`
        : null,
    primaryText,
    secondaryText,
  };
}

function toSuggestions(response: PhotonResponse): AddressSuggestion[] {
  return (response.features ?? [])
    .filter(
      (feature) =>
        !feature.properties?.countrycode ||
        feature.properties.countrycode.toUpperCase() === 'PH',
    )
    .map(toSuggestion)
    .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null)
    .slice(0, SUGGESTION_LIMIT);
}

@Injectable({ providedIn: 'root' })
export class AddressLookupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveGeocoderUrl();

  /**
   * Suggests addresses for the typed text. A lookup failure resolves to an
   * empty list on purpose: address search is an assist, never a gate.
   */
  search(query: string): Observable<AddressSuggestion[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return of([]);

    const params = new URLSearchParams({
      q: trimmed,
      lang: 'en',
      lat: String(SEARCH_BIAS.latitude),
      limit: String(SUGGESTION_LIMIT * 2),
      lon: String(SEARCH_BIAS.longitude),
    });

    return this.http.get<PhotonResponse>(`${this.baseUrl}/api?${params.toString()}`).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map(toSuggestions),
      catchError(() => of([])),
    );
  }

  /** Resolves a readable address for coordinates captured from the device. */
  reverse(latitude: number, longitude: number): Observable<AddressSuggestion | null> {
    const params = new URLSearchParams({
      lang: 'en',
      lat: String(latitude),
      lon: String(longitude),
    });

    return this.http.get<PhotonResponse>(`${this.baseUrl}/reverse?${params.toString()}`).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map((response) => toSuggestions(response)[0] ?? null),
      catchError(() => of(null)),
    );
  }
}
