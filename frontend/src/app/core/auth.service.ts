import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiEnvelope, ApiService } from './api.service';
import { API_BASE } from './api-config';
import { AuthToken, User } from './models';

const TOKEN_KEY = 'sd_token';

/** Zarządza sesją: token Bearer (localStorage), profil użytkownika, operacje auth. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly tokenSignal = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userSignal = signal<User | null>(null);

  readonly me = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setToken(token: string | null): void {
    this.tokenSignal.set(token);
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  login(username: string, password: string): Observable<AuthToken> {
    return this.api
      .post<AuthToken>('/auth/login.php', { username, password })
      .pipe(
        tap((res) => {
          this.userSignal.set(res.user);
          this.setToken(res.token);
        }),
      );
  }

  /** Odświeża token za pomocą istniejącego (ważnego) tokenu. */
  refreshToken(): Observable<string> {
    return this.http
      .post<ApiEnvelope<{ token: string }>>(API_BASE + '/auth/refresh.php', {})
      .pipe(
        map((res) => res.data.token),
        tap((token) => this.setToken(token)),
      );
  }

  /** Ładuje profil zalogowanego użytkownika (GET /auth/me.php). */
  loadMe(): Observable<User | null> {
    if (!this.tokenSignal()) {
      this.userSignal.set(null);
      return of(null);
    }

    return this.api
      .get<User>('/auth/me.php')
      .pipe(
        tap((me) => this.userSignal.set(me)),
        catchError(() => {
          this.setToken(null);
          this.userSignal.set(null);
          return of(null);
        }),
      );
  }

  /** Zwraca profil z cache lub pobiera go, jeśli brak. */
  ensureMe(): Observable<User | null> {
    const cached = this.userSignal();
    if (cached) {
      return of(cached);
    }
    return this.loadMe();
  }

  logout(): void {
    this.setToken(null);
    this.userSignal.set(null);
  }
}
