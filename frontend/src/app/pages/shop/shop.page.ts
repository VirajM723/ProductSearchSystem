import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, map, merge, of, startWith, switchMap, tap } from 'rxjs';
import { CartService } from '../../core/cart.service';
import { Product, SearchParams, SearchResult, SortOption } from '../../core/models';
import { ProductService, errorMessage } from '../../core/product.service';
import { ToastService } from '../../core/toast.service';
import { ProductCardComponent } from '../../shared/product-card.component';
import { FiltersComponent } from './filters.component';
import { PAGE_SIZE, SORT_LABELS, fromQuery, hasFilters, toQuery } from './search-state';

type View =
  | { status: 'loading' }
  | { status: 'ready'; result: SearchResult }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-shop-page',
  standalone: true,
  imports: [RouterLink, ProductCardComponent, FiltersComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shop.page.html',
  styleUrl: './shop.page.css'
})
export class ShopPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ProductService);
  private cart = inject(CartService);
  private toast = inject(ToastService);
  private title = inject(Title);

  readonly sortLabels = SORT_LABELS;
  readonly sortKeys = Object.keys(SORT_LABELS) as SortOption[];
  readonly skeletons = Array.from({ length: 8 });
  readonly filtersOpen = signal(false);

  private retry$ = new Subject<void>();

  readonly params = toSignal(this.route.queryParamMap.pipe(map(fromQuery)), {
    initialValue: fromQuery(this.route.snapshot.queryParamMap)
  });

  private lastResult: SearchResult | null = null;

  readonly view = toSignal(
    merge(this.route.queryParamMap, this.retry$.pipe(map(() => this.route.snapshot.queryParamMap))).pipe(
      map(fromQuery),
      tap((p) => this.title.setTitle(p.q ? `“${p.q}” · Common Goods` : 'Common Goods')),
      switchMap((p) =>
        this.api.search(p).pipe(
          tap((result) => (this.lastResult = result)),
          map((result): View => ({ status: 'ready', result })),
          catchError((err) => of<View>({ status: 'error', message: errorMessage(err) })),
          startWith<View>({ status: 'loading' })
        )
      )
    ),
    { initialValue: { status: 'loading' } as View }
  );

  // While a new page of results loads, keep showing the old one (dimmed)
  // instead of flashing skeletons on every click.
  readonly result = computed(() => {
    const v = this.view();
    return v.status === 'ready' ? v.result : v.status === 'loading' ? this.lastResult : null;
  });
  readonly loading = computed(() => this.view().status === 'loading');
  readonly error = computed(() => {
    const v = this.view();
    return v.status === 'error' ? v.message : null;
  });

  readonly isBrowsing = computed(() => !this.params().q && !hasFilters(this.params()));
  readonly activeSort = computed<SortOption>(() => this.params().sort ?? (this.params().q ? 'relevance' : 'newest'));

  readonly chips = computed(() => {
    const p = this.params();
    const chips: { label: string; remove: Partial<SearchParams> }[] = [];
    for (const c of p.category ?? []) chips.push({ label: c, remove: { category: p.category!.filter((x) => x !== c) } });
    for (const b of p.brand ?? []) chips.push({ label: b, remove: { brand: p.brand!.filter((x) => x !== b) } });
    if (p.minPrice != null || p.maxPrice != null) {
      const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
      const label =
        p.minPrice != null && p.maxPrice != null
          ? `${fmt(p.minPrice)} – ${fmt(p.maxPrice)}`
          : p.minPrice != null
            ? `From ${fmt(p.minPrice)}`
            : `Up to ${fmt(p.maxPrice!)}`;
      chips.push({ label, remove: { minPrice: null, maxPrice: null } });
    }
    if (p.inStock) chips.push({ label: 'In stock', remove: { inStock: false } });
    return chips;
  });

  readonly pages = computed(() => {
    const r = this.result();
    if (!r || r.pages <= 1) return [];
    const current = r.page;
    const last = r.pages;
    const out: (number | null)[] = [];
    for (let n = 1; n <= last; n++) {
      if (n === 1 || n === last || Math.abs(n - current) <= 1) out.push(n);
      else if (out[out.length - 1] !== null) out.push(null);
    }
    return out;
  });

  readonly rangeLabel = computed(() => {
    const r = this.result();
    if (!r || r.total === 0) return '';
    const from = (r.page - 1) * r.limit + 1;
    const to = Math.min(r.total, r.page * r.limit);
    return r.total <= PAGE_SIZE ? `${r.total} ${r.total === 1 ? 'product' : 'products'}` : `${from}–${to} of ${r.total}`;
  });

  update(change: Partial<SearchParams>, resetPage = true): void {
    const next = { ...this.params(), ...change };
    if (resetPage && !('page' in change)) next.page = 1;
    this.router.navigate([], { queryParams: toQuery(next) });
  }

  setSort(value: string): void {
    this.update({ sort: value as SortOption });
  }

  goToPage(page: number): void {
    this.update({ page }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearAll(): void {
    this.router.navigate([], { queryParams: { q: this.params().q || null } });
  }

  retry(): void {
    this.retry$.next();
  }

  addToBag(product: Product): void {
    this.cart.add(product);
    this.toast.show(`Added ${product.name} to your bag`);
  }
}
