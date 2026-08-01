import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, type Observable, of, switchMap, timeout } from 'rxjs';

declare global {
  interface Window {
    __SPINNER_GEOCODER_URL__?: string;
    __SPINNER_NOMINATIM_URL__?: string;
  }
}

/**
 * Two key-less OpenStreetMap services, used for different strengths:
 *
 * - Photon is built for type-ahead and is good at named places (schools, stores,
 *   waiting sheds).
 * - Nominatim, when bounded to a viewbox, resolves administrative places such as
 *   the barangay itself. Photon alone returns "San Vicente Elementary School"
 *   for "San Vicente Carmen"; the bounded Nominatim query returns the barangay
 *   "San Vicente, Surigao del Sur", which is what the customer meant.
 */
const DEFAULT_PHOTON_URL = 'https://photon.komoot.io';
const DEFAULT_NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

/** Fallback centre when the shop has no configured coordinates yet. */
const DEFAULT_BIAS: GeoBias = { latitude: 9.2381784, longitude: 125.9624521, radiusKm: 25 };

const LOOKUP_TIMEOUT_MS = 6000;
const SUGGESTION_LIMIT = 7;
/** Below this many local hits, the bounded provider is worth the extra call. */
const SPARSE_RESULT_THRESHOLD = 4;

export interface GeoBias {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface AddressSuggestion {
  barangay: string | null;
  cityOrMunicipality: string | null;
  /** Kilometres from the bias centre. Used for ranking and display. */
  distanceKm: number | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  primaryText: string;
  secondaryText: string;
}

interface PhotonProperties {
  city?: string;
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
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface NominatimAddress {
  city?: string;
  county?: string;
  municipality?: string;
  neighbourhood?: string;
  quarter?: string;
  road?: string;
  state?: string;
  suburb?: string;
  town?: string;
  village?: string;
}

interface NominatimPlace {
  address?: NominatimAddress;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  osm_id?: number;
  osm_type?: string;
}

function resolveUrl(configured: string | undefined, fallback: string): string {
  return (configured?.trim() || fallback).replace(/\/+$/, '');
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

function kilometresBetween(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

@Injectable({ providedIn: 'root' })
export class AddressLookupService {
  private readonly http = inject(HttpClient);
  private readonly photonUrl = resolveUrl(window.__SPINNER_GEOCODER_URL__, DEFAULT_PHOTON_URL);
  private readonly nominatimUrl = resolveUrl(
    window.__SPINNER_NOMINATIM_URL__,
    DEFAULT_NOMINATIM_URL,
  );

  /**
   * Suggests places for the typed text, nearest first.
   *
   * A lookup failure resolves to an empty list on purpose: address search is an
   * assist, and the customer can always drag the map pin instead.
   */
  search(query: string, bias: GeoBias = DEFAULT_BIAS): Observable<AddressSuggestion[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return of([]);

    return this.searchPhoton(trimmed, bias).pipe(
      switchMap((photonResults) => {
        if (photonResults.length >= SPARSE_RESULT_THRESHOLD) {
          return of(this.rank(photonResults, bias));
        }

        // Thin results usually mean the place is administrative rather than a
        // named POI, which is exactly what the bounded query is good at.
        return forkJoin({
          bounded: this.searchNominatim(trimmed, bias),
          photon: of(photonResults),
        }).pipe(map(({ bounded, photon }) => this.rank([...photon, ...bounded], bias)));
      }),
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

    return this.http.get<PhotonResponse>(`${this.photonUrl}/reverse?${params.toString()}`).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map((response) => this.fromPhoton(response)[0] ?? null),
      catchError(() => of(null)),
    );
  }

  private searchPhoton(query: string, bias: GeoBias): Observable<AddressSuggestion[]> {
    const params = new URLSearchParams({
      q: query,
      lang: 'en',
      lat: String(bias.latitude),
      limit: '15',
      lon: String(bias.longitude),
    });

    return this.http.get<PhotonResponse>(`${this.photonUrl}/api?${params.toString()}`).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map((response) => this.fromPhoton(response)),
      catchError(() => of([])),
    );
  }

  private searchNominatim(query: string, bias: GeoBias): Observable<AddressSuggestion[]> {
    // A viewbox roughly covering the service area. Longitude degrees shrink with
    // latitude, but near the equator the difference is small enough to ignore.
    const span = Math.max(0.05, bias.radiusKm / 111);
    const params = new URLSearchParams({
      addressdetails: '1',
      bounded: '1',
      countrycodes: 'ph',
      format: 'jsonv2',
      limit: '10',
      q: query,
      viewbox: [
        bias.longitude - span,
        bias.latitude + span,
        bias.longitude + span,
        bias.latitude - span,
      ].join(','),
    });

    return this.http.get<NominatimPlace[]>(`${this.nominatimUrl}/search?${params.toString()}`).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map((places) => this.fromNominatim(places)),
      catchError(() => of([])),
    );
  }

  private fromPhoton(response: PhotonResponse): AddressSuggestion[] {
    return (response.features ?? [])
      .filter(
        (feature) =>
          !feature.properties?.countrycode || feature.properties.countrycode.toUpperCase() === 'PH',
      )
      .map((feature): AddressSuggestion | null => {
        const coordinates = feature.geometry?.coordinates;
        const properties = feature.properties;
        if (!coordinates || coordinates.length < 2 || !properties) return null;

        const [longitude, latitude] = coordinates;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        const street =
          properties.housenumber && properties.street
            ? `${properties.housenumber} ${properties.street}`
            : properties.street;
        const barangay = properties.suburb ?? properties.locality ?? properties.district ?? null;
        const cityOrMunicipality = properties.city ?? properties.county ?? null;
        const primaryParts = unique([properties.name, street]);
        const secondaryParts = unique([
          barangay,
          cityOrMunicipality,
          properties.state,
          properties.country,
        ]);

        return {
          barangay,
          cityOrMunicipality,
          distanceKm: null,
          formattedAddress: unique([...primaryParts, ...secondaryParts]).join(', '),
          latitude,
          longitude,
          placeId:
            properties.osm_type && properties.osm_id !== undefined
              ? `${properties.osm_type}${properties.osm_id}`
              : null,
          primaryText: primaryParts.join(' · ') || secondaryParts[0] || 'Unnamed location',
          secondaryText: secondaryParts.join(', '),
        };
      })
      .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null);
  }

  private fromNominatim(places: NominatimPlace[]): AddressSuggestion[] {
    return (places ?? [])
      .map((place): AddressSuggestion | null => {
        const latitude = Number(place.lat);
        const longitude = Number(place.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        const address = place.address ?? {};
        const barangay =
          address.suburb ?? address.neighbourhood ?? address.quarter ?? address.village ?? null;
        const cityOrMunicipality =
          address.city ?? address.town ?? address.municipality ?? address.county ?? null;
        const primary = place.name?.trim() || address.road || barangay || 'Unnamed location';
        const secondaryParts = unique([
          barangay === primary ? null : barangay,
          cityOrMunicipality,
          address.state,
        ]);

        return {
          barangay,
          cityOrMunicipality,
          distanceKm: null,
          formattedAddress:
            place.display_name?.trim() || unique([primary, ...secondaryParts]).join(', '),
          latitude,
          longitude,
          placeId:
            place.osm_type && place.osm_id !== undefined
              ? `${place.osm_type.charAt(0).toUpperCase()}${place.osm_id}`
              : null,
          primaryText: primary,
          secondaryText: secondaryParts.join(', '),
        };
      })
      .filter((suggestion): suggestion is AddressSuggestion => suggestion !== null);
  }

  /**
   * Deduplicates and orders by distance from the bias centre.
   *
   * Proximity ranking is what removes cross-province noise: a "San Vicente
   * Street" in Surigao del Norte no longer outranks the San Vicente barangay a
   * few kilometres from the shop.
   */
  private rank(suggestions: AddressSuggestion[], bias: GeoBias): AddressSuggestion[] {
    const seen = new Set<string>();
    const measured: AddressSuggestion[] = [];

    for (const suggestion of suggestions) {
      const key = [
        suggestion.latitude.toFixed(4),
        suggestion.longitude.toFixed(4),
        suggestion.primaryText.toLowerCase(),
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      measured.push({
        ...suggestion,
        distanceKm:
          Math.round(
            kilometresBetween(
              bias.latitude,
              bias.longitude,
              suggestion.latitude,
              suggestion.longitude,
            ) * 10,
          ) / 10,
      });
    }

    return measured
      .sort((left, right) => (left.distanceKm ?? 0) - (right.distanceKm ?? 0))
      .slice(0, SUGGESTION_LIMIT);
  }
}
