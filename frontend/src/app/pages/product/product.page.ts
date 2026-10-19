import { ChangeDetectionStrategy, Component, Input, OnChanges, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CartService } from '../../core/cart.service';
import { Product } from '../../core/models';
import { ProductService, errorMessage } from '../../core/product.service';
import { ToastService } from '../../core/toast.service';
import { PricePipe } from '../../shared/price.pipe';
import { ProductArtComponent } from '../../shared/product-art.component';
import { ProductCardComponent } from '../../shared/product-card.component';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [RouterLink, PricePipe, ProductArtComponent, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      @if (error()) {
        <div class="state">
          <h1 class="display">{{ notFound() ? 'This product is gone' : 'Something went wrong' }}</h1>
          <p>{{ notFound() ? 'It may have been removed, or the link is wrong.' : error() }}</p>
          <a routerLink="/" class="btn btn-primary">Back to the shop</a>
        </div>
      } @else if (product()) {
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Shop</a>
          <span>/</span>
          <a routerLink="/" [queryParams]="{ category: product()!.category }">{{ product()!.category }}</a>
          <span>/</span>
          <span class="current">{{ product()!.name }}</span>
        </nav>

        <div class="detail">
          <app-product-art class="art" [category]="product()!.category" [name]="product()!.name" [image]="product()!.image" />

          <div class="info">
            <a class="brand" routerLink="/" [queryParams]="{ brand: product()!.brand }">{{ product()!.brand }}</a>
            <h1 class="display">{{ product()!.name }}</h1>

            <div class="meta">
              <span class="price">{{ product()!.price | price }}</span>
              @if (product()!.rating) {
                <span class="rating">★ {{ product()!.rating!.toFixed(1) }} <span class="muted">/ 5</span></span>
              }
            </div>

            <p class="description">{{ product()!.description }}</p>

            <div class="stock" [class.out]="!product()!.inStock">
              <span class="dot"></span>
              {{ product()!.inStock ? 'In stock, ships in 2 to 3 days' : 'Sold out for now' }}
            </div>

            <div class="buy">
              <div class="qty" role="group" aria-label="Quantity">
                <button type="button" (click)="qty.set(qty() - 1)" [disabled]="qty() <= 1" aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{{ qty() }}</span>
                <button type="button" (click)="qty.set(qty() + 1)" [disabled]="qty() >= cart.maxQty" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="btn btn-primary add" [disabled]="!product()!.inStock" (click)="addToBag(product()!)">
                {{ product()!.inStock ? 'Add to bag' : 'Unavailable' }}
              </button>
            </div>
            @if (cart.qtyOf(product()!._id) > 0) {
              <p class="in-bag">{{ cart.qtyOf(product()!._id) }} already in your bag. <button type="button" (click)="cart.open.set(true)">View bag</button></p>
            }

            <dl class="specs">
              <div><dt>Category</dt><dd>{{ product()!.category }}</dd></div>
              <div><dt>Brand</dt><dd>{{ product()!.brand }}</dd></div>
              @if (product()!.tags.length) {
                <div>
                  <dt>Tags</dt>
                  <dd class="tags">
                    @for (tag of product()!.tags; track tag) {
                      <a routerLink="/" [queryParams]="{ q: tag }">{{ tag }}</a>
                    }
                  </dd>
                </div>
              }
            </dl>
          </div>
        </div>

        @if (related().length) {
          <section class="related">
            <h2 class="display">More in {{ product()!.category }}</h2>
            <div class="grid">
              @for (item of related(); track item._id) {
                <app-product-card [product]="item" (add)="addToBag($event, 1)" />
              }
            </div>
          </section>
        }
      } @else {
        <div class="detail loading" aria-busy="true">
          <div class="skeleton" style="aspect-ratio: 1"></div>
          <div class="info">
            <div class="skeleton" style="height: 14px; width: 30%"></div>
            <div class="skeleton" style="height: 48px; width: 80%"></div>
            <div class="skeleton" style="height: 120px"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .crumbs { display: flex; flex-wrap: wrap; gap: 8px; padding: 28px 0; font-size: 13px; color: var(--faint); }
    .crumbs a { color: var(--muted); text-decoration: none; }
    .crumbs a:hover { color: var(--text); }
    .crumbs .current { color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40ch; }
    .detail { display: grid; grid-template-columns: 1.1fr 1fr; gap: 64px; align-items: start; }
    .detail.loading { padding-top: 76px; }
    .art { position: sticky; top: 96px; }
    .info { display: flex; flex-direction: column; gap: 20px; }
    .brand { font-size: 14px; color: var(--muted); text-decoration: none; }
    .brand:hover { color: var(--text); }
    h1 { font-size: clamp(36px, 4.4vw, 54px); margin-top: -10px; word-break: break-word; }
    .meta { display: flex; align-items: baseline; gap: 20px; }
    .price { font-size: 22px; font-weight: 500; font-variant-numeric: tabular-nums; }
    .rating { font-size: 14px; }
    .muted { color: var(--faint); }
    .description { color: #3d3b37; font-size: 16px; line-height: 1.65; max-width: 52ch; }
    .stock { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--accent); }
    .stock .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .stock.out { color: var(--danger); }
    .buy { display: flex; gap: 12px; }
    .qty {
      display: flex; align-items: center;
      border: 1px solid var(--border-strong); border-radius: var(--radius);
      height: 44px;
    }
    .qty button { width: 40px; height: 100%; border: 0; background: none; font-size: 18px; cursor: pointer; }
    .qty button:disabled { color: var(--faint); cursor: default; }
    .qty span { min-width: 24px; text-align: center; font-variant-numeric: tabular-nums; }
    .add { flex: 1; max-width: 320px; }
    .in-bag { font-size: 13px; color: var(--muted); margin-top: -8px; }
    .in-bag button { border: 0; background: none; padding: 0; color: var(--text); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; font-size: 13px; }
    .specs { margin: 12px 0 0; border-top: 1px solid var(--border); }
    .specs div { display: grid; grid-template-columns: 120px 1fr; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px; }
    dt { color: var(--muted); }
    dd { margin: 0; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px 12px; }
    .tags a { color: var(--text); text-underline-offset: 3px; text-decoration-color: var(--border-strong); }
    .related { margin-top: 96px; }
    .related h2 { font-size: 34px; margin-bottom: 28px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
    .state { max-width: 460px; padding: 96px 0; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
    .state h1 { font-size: 44px; margin: 0; }
    .state p { color: var(--muted); }
    @media (max-width: 860px) {
      .detail { grid-template-columns: 1fr; gap: 28px; }
      .art { position: static; }
      .grid { grid-template-columns: 1fr 1fr; gap: 28px 14px; }
      .add { max-width: none; }
    }
  `]
})
export class ProductPage implements OnChanges {
  @Input() id = '';

  readonly cart = inject(CartService);
  private api = inject(ProductService);
  private toast = inject(ToastService);
  private title = inject(Title);

  readonly product = signal<Product | null>(null);
  readonly related = signal<Product[]>([]);
  readonly error = signal<string | null>(null);
  readonly notFound = signal(false);
  readonly qty = signal(1);

  ngOnChanges(): void {
    this.product.set(null);
    this.related.set([]);
    this.error.set(null);
    this.notFound.set(false);
    this.qty.set(1);

    this.api.get(this.id).subscribe({
      next: (product) => {
        this.product.set(product);
        this.title.setTitle(`${product.name} · Common Goods`);
        this.loadRelated(product);
      },
      error: (err) => {
        this.notFound.set(err?.status === 404 || err?.status === 400);
        this.error.set(errorMessage(err));
        this.title.setTitle('Not found · Common Goods');
      }
    });
  }

  addToBag(product: Product, qty = this.qty()): void {
    this.cart.add(product, qty);
    this.toast.show(`Added ${product.name} to your bag`);
  }

  private loadRelated(product: Product): void {
    this.api
      .search({ category: [product.category], limit: 5, sort: 'rating' })
      .pipe(catchError(() => of(null)))
      .subscribe((result) => {
        this.related.set((result?.items ?? []).filter((p) => p._id !== product._id).slice(0, 4));
      });
  }
}
