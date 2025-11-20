import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Product } from '../../services/product.service';

@Component({
  selector: 'app-product-list',
  template: `
    
      Products ({{ products.length }})
      
        No products found. Try adjusting your search or add a new product.
      
      
        
          
            {{ product.name }}
            
              {{ product.inStock ? 'In Stock' : 'Out of Stock' }}
            
          
          {{ product.description }}
          
            {{ product.category }}
            {{ product.brand }}
          
          \${{ product.price.toFixed(2) }}
          
            {{ tag }}
          
          
            Edit
            Delete
          
        
      
    
  `,
  styles: [`
    .product-list {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .no-products {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .product-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      transition: transform 0.2s;
    }
    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .product-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .product-header h3 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      background: #dc3545;
      color: white;
    }
    .badge.in-stock {
      background: #28a745;
    }
    .description {
      color: #666;
      margin: 10px 0;
      line-height: 1.5;
    }
    .product-details {
      display: flex;
      gap: 10px;
      margin: 10px 0;
    }
    .category, .brand {
      padding: 4px 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 12px;
    }
    .price {
      font-size: 24px;
      font-weight: bold;
      color: #007bff;
      margin: 15px 0;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 10px 0;
    }
    .tag {
      padding: 2px 8px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 3px;
      font-size: 11px;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
    }
    .btn-edit, .btn-delete {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-edit {
      background: #ffc107;
      color: #000;
    }
    .btn-delete {
      background: #dc3545;
      color: white;
    }
  `]
})
export class ProductListComponent {
  @Input() products: Product[] = [];
  @Output() edit = new EventEmitter();
  @Output() delete = new EventEmitter();

  onEdit(product: Product) {
    this.edit.emit(product);
  }

  onDelete(product: Product) {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      this.delete.emit(product);
    }
  }
}