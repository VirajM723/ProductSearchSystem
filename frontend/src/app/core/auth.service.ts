import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  // undefined until we've asked the server, then a username or null.
  readonly user = signal<string | null | undefined>(undefined);
  readonly isAdmin = computed(() => !!this.user());

  private pending?: Observable<boolean>;

  /** Asks the server once whether there's a session; later calls reuse the answer. */
  check(): Observable<boolean> {
    if (this.user() !== undefined) return of(!!this.user());
    this.pending ??= this.http.get<{ username: string | null }>(`${this.base}/me`).pipe(
      map((res) => res.username),
      catchError(() => of(null)),
      tap((username) => {
        this.user.set(username);
        this.pending = undefined;
      }),
      map(Boolean),
      shareReplay(1)
    );
    return this.pending;
  }

  login(username: string, password: string): Observable<{ username: string }> {
    return this.http
      .post<{ username: string }>(`${this.base}/login`, { username, password })
      .pipe(tap((res) => this.user.set(res.username)));
  }

  logout(): Observable<unknown> {
    return this.http.post(`${this.base}/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.user.set(null))
    );
  }

  /** The server said our session is gone (expired, or the password changed). */
  sessionEnded(): void {
    this.user.set(null);
  }
}
