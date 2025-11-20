import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  _id?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  brand: string;
  tags: string[];
  inStock: boolean;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  searchProducts(query: string, filters: any = {}): Observable<any> {
    let params = new HttpParams();
    if (query) params = params.set('q', query);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.brand) params = params.set('brand', filters.brand);
    if (filters.minPrice) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params = params.set('maxPrice', filters.maxPrice);
    if (filters.inStock !== undefined) params = params.set('inStock', filters.inStock);

    console.log('➡️ Calling:', `${this.apiUrl}/search`, 'with params:', params.toString());

    return this.http.get(`${this.apiUrl}/search`, { params });
  }

  createProduct(product: Product): Observable<any> {
    return this.http.post(this.apiUrl, product);
  }

  updateProduct(id: string, product: Product): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
