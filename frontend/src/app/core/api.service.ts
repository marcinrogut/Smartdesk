import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE } from './api-config';

/** Wspólna koperta odpowiedzi API v1. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  errors?: Record<string, string>;
}

export type ParamValue = string | number | boolean;

/** Parametry zapytania — `undefined`/`null`/puste stringi są pomijane w `buildParams`. */
export type QueryParams = Record<string, ParamValue | undefined | null>;

function buildParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  if (!params) {
    return httpParams;
  }
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}

/** Cienki klient HTTP, który odpakowuje kopertę { success, message, data }. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiEnvelope<T>>(API_BASE + path, { params: buildParams(params) })
      .pipe(map((res) => res.data));
  }

  post<T>(path: string, body: unknown = {}, params?: QueryParams): Observable<T> {
    return this.http
      .post<ApiEnvelope<T>>(API_BASE + path, body, { params: buildParams(params) })
      .pipe(map((res) => res.data));
  }

  put<T>(path: string, body: unknown = {}, params?: QueryParams): Observable<T> {
    return this.http
      .put<ApiEnvelope<T>>(API_BASE + path, body, { params: buildParams(params) })
      .pipe(map((res) => res.data));
  }

  patch<T>(path: string, body: unknown = {}, params?: QueryParams): Observable<T> {
    return this.http
      .patch<ApiEnvelope<T>>(API_BASE + path, body, { params: buildParams(params) })
      .pipe(map((res) => res.data));
  }

  delete<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .delete<ApiEnvelope<T>>(API_BASE + path, { params: buildParams(params) })
      .pipe(map((res) => res.data));
  }
}
