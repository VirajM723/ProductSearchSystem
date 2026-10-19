import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Product, SearchResult } from '../../core/models';
import { ProductService, errorMessage } from '../../core/product.service';
import { ToastService } from '../../core/toast.service';
import { PricePipe } from '../../shared/price.pipe';
import { ProductArtComponent } from '../../shared/product-art.component';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PricePipe, ProductArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <header class="top">
        <div>
          <p class="eyebrow">Store</p>
          <h1 class="display">Inventory</h1>
        </div>
        <div class="actions">
          @if (health(); as h) {
            <span class="status" [class.warn]="h.elasticsearch !== 'up'">
              <span class="dot"></span>
              {{ h.elasticsearch === 'up' ? 'Search index online' : 'Search index offline' }}
            </span>
          }
          <button type="button" class="btn btn-outline" (click)="reindex()" [disabled]="reindexing()">
            {{ reindexing() ? 'Rebuilding…' : 'Rebuild index' }}
          </button>
          <a routerLink="/manage/new" class="btn btn-primary">New product</a>
        </div>
      </header>

      <div class="toolbar">
        <input class="input" type="search" placeholder="Filter by name, brand or category" aria-label="Filter products"
          [ngModel]="query()" (ngModelChange)="typed$.next($event)" />
        <select class="select" [ngModel]="stock()" (ngModelChange)="stock.set($event); load(1)" aria-label="Stock filter">
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="out">Sold out</option>
        </select>
      </div>

      @if (error()) {
        <div class="empty">
          <p>{{ error() }}</p>
          <button type="button" class="btn btn-outline" (click)="load(page())">Try again</button>
        </div>
      } @else if (result()) {
        @if (result()!.items.length === 0) {
          <div class="empty">
            <p>{{ query() ? 'No products match that filter.' : 'No products yet.' }}</p>
            <a routerLink="/manage/new" class="btn btn-outline">Add the first one</a>
          </div>
        } @else {
          <div class="table-wrap" [class.busy]="loading()">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th class="num">Price</th>
                  <th>Stock</th>
                  <th><span class="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                @for (p of result()!.items; track p._id) {
                  <tr>
                    <td>
                      <div class="product">
                        <app-product-art class="thumb" [category]="p.category" [name]="p.name" [image]="p.image" [compact]="true" />
                        <div>
                          <a [routerLink]="['/manage', p._id]" class="name">{{ p.name }}</a>
                          <span class="sub">{{ p.brand }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="muted">{{ p.category }}</td>
                    <td class="num">{{ p.price | price }}</td>
                    <td>
                      <span class="pill" [class.out]="!p.inStock">{{ p.inStock ? 'In stock' : 'Sold out' }}</span>
                    </td>
                    <td class="row-actions">
                      <a [routerLink]="['/product', p._id]" class="btn btn-ghost btn-sm">View</a>
                      <a [routerLink]="['/manage', p._id]" class="btn btn-ghost btn-sm">Edit</a>
                      @if (confirming() === p._id) {
                        <button type="button" class="btn btn-danger btn-sm" (click)="remove(p)" [disabled]="deleting()">
                          {{ deleting() ? 'Deleting…' : 'Confirm' }}
                        </button>
                      } @else {
                        <button type="button" class="btn btn-ghost btn-sm del" (click)="askDelete(p)">Delete</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="foot">
            <span class="muted">{{ result()!.total }} {{ result()!.total === 1 ? 'product' : 'products' }}</span>
            @if (result()!.pages > 1) {
              <div class="pager">
                <button type="button" class="btn btn-ghost btn-sm" [disabled]="result()!.page <= 1" (click)="load(result()!.page - 1)">Previous</button>
                <span class="muted">Page {{ result()!.page }} of {{ result()!.pages }}</span>
                <button type="button" class="btn btn-ghost btn-sm" [disabled]="result()!.page >= result()!.pages" (click)="load(result()!.page + 1)">Next</button>
              </div>
            }
          </div>
        }
      } @else {
        <div class="skeleton" style="height: 420px"></div>
      }
    </div>
  `,
  styles: [`
    .top { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; padding: 48px 0 28px; }
    h1 { font-size: 48px; margin-top: 8px; }
    .actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .status { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--accent); margin-right: 8px; }
    .status .dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
    .status.warn { color: var(--danger); }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; }
    .toolbar .input { max-width: 360px; }
    .toolbar .select { width: 160px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); transition: opacity .2s; }
    .table-wrap.busy { opacity: .6; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th { text-align: left; font-weight: 500; font-size: 12px; color: var(--muted); padding: 12px 16px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 10px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: 0; }
    tbody tr:hover { background: #fcfbf9; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .muted { color: var(--muted); }
    .product { display: flex; align-items: center; gap: 12px; min-width: 240px; }
    .thumb { width: 40px; flex: none; }
    .product div { display: flex; flex-direction: column; }
    .name { text-decoration: none; font-weight: 500; }
    .name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .sub { font-size: 12px; color: var(--muted); }
    .pill { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); white-space: nowrap; }
    .pill.out { background: var(--danger-soft); color: var(--danger); }
    .row-actions { text-align: right; white-space: nowrap; }
    .del:hover { color: var(--danger); }
    .foot { display: flex; justify-content: space-between; align-items: center; padding: 16px 4px; font-size: 14px; }
    .pager { display: flex; align-items: center; gap: 8px; }
    .empty { padding: 64px 0; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; color: var(--muted); }
    @media (max-width: 640px) {
      h1 { font-size: 40px; }
      .toolbar { flex-direction: column; }
      .toolbar .input, .toolbar .select { max-width: none; width: 100%; }
      .status { width: 100%; }
    }
  `]
})
export class InventoryPage implements OnInit {
  private api = inject(ProductService);
  private toast = inject(ToastService);

  readonly result = signal<SearchResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly query = signal('');
  readonly stock = signal<'all' | 'in' | 'out'>('all');
  readonly confirming = signal<string | null>(null);
  readonly deleting = signal(false);
  readonly reindexing = signal(false);
  readonly health = signal<{ elasticsearch: string } | null>(null);

  readonly typed$ = new Subject<string>();
  private confirmTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.typed$.pipe(debounceTime(250), distinctUntilChanged()).subscribe((q) => {
      this.query.set(q);
      this.load(1);
    });
    this.load(1);
    this.checkHealth();
  }

  load(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.error.set(null);
    const stock = this.stock();
    this.api
      .search({
        q: this.query().trim(),
        sort: this.query().trim() ? 'relevance' : 'newest',
        page,
        limit: 15,
        ...(stock !== 'all' && { inStock: stock === 'in' })
      })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(errorMessage(err));
          this.loading.set(false);
        }
      });
  }

  askDelete(product: Product): void {
    this.confirming.set(product._id);
    clearTimeout(this.confirmTimer);
    this.confirmTimer = setTimeout(() => this.confirming.set(null), 4000);
  }

  remove(product: Product): void {
    this.deleting.set(true);
    this.api.remove(product._id).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.confirming.set(null);
        this.toast.show(res.warning ?? `Deleted ${product.name}`);
        const r = this.result();
        // Step back a page if we just removed the last row on this one.
        this.load(r && r.items.length === 1 && r.page > 1 ? r.page - 1 : this.page());
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(errorMessage(err));
      }
    });
  }

  reindex(): void {
    this.reindexing.set(true);
    this.api.reindex().subscribe({
      next: (res) => {
        this.reindexing.set(false);
        this.toast.show(`Search index rebuilt with ${res.count} products`);
        this.checkHealth();
        this.load(this.page());
      },
      error: (err) => {
        this.reindexing.set(false);
        this.toast.error(errorMessage(err));
        this.checkHealth();
      }
    });
  }

  private checkHealth(): void {
    this.api.health().subscribe({
      next: (h) => this.health.set(h),
      error: () => this.health.set({ elasticsearch: 'down' })
    });
  }
}
