import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiError, Product, ProductInput, SearchParams, SearchResult, Suggestions } from './models';

type WithWarning<T> = T & { warning?: string };

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/products`;

  search(params: SearchParams): Observable<SearchResult> {
    let query = new HttpParams();
    if (params.q) query = query.set('q', params.q);
    if (params.category?.length) query = query.set('category', params.category.join(','));
    if (params.brand?.length) query = query.set('brand', params.brand.join(','));
    if (params.minPrice != null) query = query.set('minPrice', params.minPrice);
    if (params.maxPrice != null) query = query.set('maxPrice', params.maxPrice);
    if (params.inStock) query = query.set('inStock', 'true');
    if (params.sort) query = query.set('sort', params.sort);
    if (params.page) query = query.set('page', params.page);
    if (params.limit) query = query.set('limit', params.limit);
    return this.http.get<SearchResult>(`${this.base}/search`, { params: query });
  }

  suggest(q: string): Observable<Suggestions> {
    return this.http.get<Suggestions>(`${this.base}/suggest`, { params: { q } });
  }

  get(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${encodeURIComponent(id)}`);
  }

  meta(): Observable<{ categories: string[]; brands: string[] }> {
    return this.http.get<{ categories: string[]; brands: string[] }>(`${this.base}/meta`);
  }

  create(input: ProductInput): Observable<WithWarning<Product>> {
    return this.http.post<WithWarning<Product>>(this.base, input);
  }

  update(id: string, input: ProductInput): Observable<WithWarning<Product>> {
    return this.http.put<WithWarning<Product>>(`${this.base}/${encodeURIComponent(id)}`, input);
  }

  remove(id: string): Observable<WithWarning<{ message: string }>> {
    return this.http.delete<WithWarning<{ message: string }>>(`${this.base}/${encodeURIComponent(id)}`);
  }

  reindex(): Observable<{ count: number }> {
    return this.http.post<{ count: number }>(`${this.base}/reindex`, {});
  }

  health(): Observable<{ status: string; mongo: string; elasticsearch: string }> {
    return this.http.get<{ status: string; mongo: string; elasticsearch: string }>(`${environment.apiUrl}/health`);
  }
}

// Pulls a readable message out of whatever the API (or the network) gave us.
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return "Can't reach the server. Is the API running?";
    const body = err.error as ApiError | null;
    if (body?.error) return body.error;
    return `Request failed (${err.status})`;
  }
  return 'Something went wrong';
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof HttpErrorResponse && err.error?.fields) return err.error.fields;
  return {};
}

