import { Component, OnInit } from '@angular/core';
import { ProductService, Product } from './services/product.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  products: Product[] = [];
  searchQuery: string = '';
  loading: boolean = false;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadAllProducts();
  }

  /** 🔹 Load all products initially */
  loadAllProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
        console.log(' Loaded products:', data);
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.loading = false;
      }
    });
  }

  /** 🔹 Triggered when search bar emits a query */
  onSearch(event: any): void {
    const { query, filters } = event || { query: this.searchQuery, filters: {} };
    const trimmedQuery = (query || '').trim();

    console.log('Searching for:', trimmedQuery, 'with filters:', filters);

    if (!trimmedQuery && Object.keys(filters).length === 0) {
      this.loadAllProducts();
      return;
    }

    this.loading = true;
    this.productService.searchProducts(trimmedQuery, filters).subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
        console.log('Search results:', data);
      },
      error: (err) => {
        console.error('Search failed:', err);
        this.loading = false;
      }
    });
  }

  /** 🔹 Edit product (placeholder) */
  onEditProduct(product: Product): void {
    console.log('✏️ Editing product:', product);
    // TODO: Add edit functionality later
  }

  /** 🔹 Delete product */
  onDeleteProduct(product: Product): void {
    if (confirm(`🗑️ Delete product "${product.name}"?`)) {
      this.productService.deleteProduct(product._id!).subscribe({
        next: () => {
          this.products = this.products.filter(p => p._id !== product._id);
          console.log('✅ Product deleted successfully');
        },
        error: (err) => console.error('Delete failed:', err)
      });
    }
  }
}
