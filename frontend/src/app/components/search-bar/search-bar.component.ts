import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  template: `
    <div class="search-container">
      <h2>🛍️ Product Search</h2>

      <div class="search-box">
        <input
          type="text"
          placeholder="Search for products..."
          [(ngModel)]="searchQuery"
          class="search-input"
        />
        <button class="search-btn" (click)="onSearch()">Search</button>
        <button class="clear-btn" (click)="onClear()">Clear</button>
      </div>

      <div class="filters">
        <select [(ngModel)]="filters.category" class="filter-select">
          <option value="">All Categories</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
          <option value="books">Books</option>
          <option value="home">Home</option>
        </select>

        <select [(ngModel)]="filters.brand" class="filter-select">
          <option value="">All Brands</option>
          <option value="apple">Apple</option>
          <option value="samsung">Samsung</option>
          <option value="nike">Nike</option>
          <option value="sony">Sony</option>
        </select>

        <label class="checkbox-label">
          <input type="checkbox" [(ngModel)]="filters.inStock" />
          In Stock Only
        </label>
      </div>
    </div>
  `,
  styles: [`
    .search-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    h2 {
      margin-top: 0;
      font-size: 20px;
      color: #333;
    }
    .search-box {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }
    .search-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    .search-btn, .clear-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s ease-in-out;
    }
    .search-btn {
      background: #007bff;
      color: white;
    }
    .search-btn:hover {
      background: #0056b3;
    }
    .clear-btn {
      background: #6c757d;
      color: white;
    }
    .clear-btn:hover {
      background: #545b62;
    }
    .filters {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-select {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 5px;
    }
  `]
})
export class SearchBarComponent {
  searchQuery = '';
  filters = {
    category: '',
    brand: '',
    inStock: false
  };

  @Output() search = new EventEmitter<{ query: string; filters: any }>();

  onSearch() {
    this.search.emit({
      query: this.searchQuery,
      filters: this.filters
    });
  }

  onClear() {
    this.searchQuery = '';
    this.filters = { category: '', brand: '', inStock: false };
    this.search.emit({ query: '', filters: this.filters });
  }
}
