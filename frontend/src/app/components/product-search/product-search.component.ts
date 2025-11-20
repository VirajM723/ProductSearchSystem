import { Component, OnInit } from '@angular/core';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-product-search',
  templateUrl: './product-search.component.html',
  styleUrls: ['./product-search.component.css']
})
export class ProductSearchComponent implements OnInit {
  products: Product[] = [];
  searchQuery = '';
  selectedCategory = '';
  selectedBrand = '';
  inStockOnly = false;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadAllProducts();
  }

  loadAllProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => this.products = data,
      error: (err) => console.error('Error fetching products:', err)
    });
  }

  onSearch(): void {
    const filters = {
      category: this.selectedCategory,
      brand: this.selectedBrand,
      inStock: this.inStockOnly
    };

    if (!this.searchQuery.trim()) {
      this.loadAllProducts();
      return;
    }

    this.productService.searchProducts(this.searchQuery, filters).subscribe({
      next: (data) => this.products = data,
      error: (err) => console.error('Search failed:', err)
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.inStockOnly = false;
    this.loadAllProducts();
  }
}
