import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../core/models';
import { PricePipe } from './price.pipe';
import { ProductArtComponent } from './product-art.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, PricePipe, ProductArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <a [routerLink]="['/product', product._id]" class="media">
        <app-product-art [category]="product.category" [name]="product.name" [image]="product.image" />
        @if (!product.inStock) {
          <span class="flag">Sold out</span>
        }
      </a>
      <div class="body">
        <div class="row">
          <span class="brand">{{ product.brand }}</span>
          @if (product.rating) {
            <span class="rating" [attr.aria-label]="'Rated ' + product.rating + ' out of 5'">★ {{ product.rating.toFixed(1) }}</span>
          }
        </div>
        <a [routerLink]="['/product', product._id]" class="name">{{ product.name }}</a>
        <div class="row bottom">
          <span class="price">{{ product.price | price }}</span>
          <button
            type="button"
            class="add"
            [disabled]="!product.inStock"
            (click)="add.emit(product)"
            [attr.aria-label]="'Add ' + product.name + ' to bag'">
            {{ product.inStock ? 'Add' : 'Unavailable' }}
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .card { display: flex; flex-direction: column; gap: 12px; }
    .media { position: relative; display: block; }
    .media:hover ::ng-deep svg { transform: scale(1.06); }
    .flag {
      position: absolute;
      top: 10px;
      left: 10px;
      background: var(--surface);
      color: var(--text);
      font-size: 11px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 99px;
    }
    .body { display: flex; flex-direction: column; gap: 4px; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .brand { font-size: 12px; color: var(--muted); }
    .rating { font-size: 12px; color: var(--muted); }
    .name {
      font-size: 15px;
      line-height: 1.35;
      color: var(--text);
      text-decoration: none;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .bottom { margin-top: 6px; }
    .price { font-weight: 500; font-variant-numeric: tabular-nums; }
    .add {
      font-size: 13px;
      padding: 6px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 99px;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      transition: background .15s, color .15s, border-color .15s;
    }
    .add:hover:not(:disabled) { background: var(--text); color: var(--bg); border-color: var(--text); }
    .add:disabled { color: var(--muted); border-color: var(--border); cursor: default; }
  `]
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Output() add = new EventEmitter<Product>();
}
