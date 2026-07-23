import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { ApiRequestOptions } from './api-types';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  get<TResponse>(path: string, options?: ApiRequestOptions) {
    return this.http.get<TResponse>(this.url(path), {
      params: this.params(options),
    });
  }

  post<TResponse, TBody = unknown>(path: string, body?: TBody, options?: ApiRequestOptions) {
    return this.http.post<TResponse>(this.url(path), body ?? {}, {
      params: this.params(options),
    });
  }

  put<TResponse, TBody = unknown>(path: string, body: TBody, options?: ApiRequestOptions) {
    return this.http.put<TResponse>(this.url(path), body, {
      params: this.params(options),
    });
  }

  delete<TResponse>(path: string, options?: ApiRequestOptions) {
    return this.http.delete<TResponse>(this.url(path), {
      params: this.params(options),
    });
  }

  private url(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.apiBaseUrl}${normalizedPath}`;
  }

  private params(options?: ApiRequestOptions) {
    let params = new HttpParams();

    Object.entries(options?.query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
