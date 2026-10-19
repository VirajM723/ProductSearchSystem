import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FacetValue, SearchParams, SearchResult } from '../../core/models';
import { PricePipe } from '../../shared/price.pipe';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [FormsModule, PricePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="group">
      <h3>Category</h3>
      @for (facet of categories; track facet.value) {
        <label class="check">
          <input type="checkbox" [checked]="isOn('category', facet.value)" (change)="toggle('category', facet.value)" />
          <span class="text">{{ facet.value }}</span>
          <span class="count">{{ facet.count }}</span>
        </label>
      } @empty {
        <p class="none">No categories</p>
      }
    </section>

    <section class="group">
      <h3>Brand</h3>
      @for (facet of visibleBrands; track facet.value) {
        <label class="check">
          <input type="checkbox" [checked]="isOn('brand', facet.value)" (change)="toggle('brand', facet.value)" />
          <span class="text">{{ facet.value }}</span>
          <span class="count">{{ facet.count }}</span>
        </label>
      } @empty {
        <p class="none">No brands</p>
      }
      @if (brands.length > brandLimit) {
        <button type="button" class="more" (click)="showAllBrands = !showAllBrands">
          {{ showAllBrands ? 'Show fewer' : 'Show all ' + brands.length }}
        </button>
      }
    </section>

    <section class="group">
      <h3>Price</h3>
      <form class="price" (submit)="applyPrice($event)">
        <label>
          <span class="visually-hidden">Minimum price</span>
          <input class="input" type="number" min="0" inputmode="numeric" name="min"
            placeholder="Min" [(ngModel)]="min" />
        </label>
        <span class="dash">–</span>
        <label>
          <span class="visually-hidden">Maximum price</span>
          <input class="input" type="number" min="0" inputmode="numeric" name="max"
            placeholder="Max" [(ngModel)]="max" />
        </label>
        <button type="submit" class="btn btn-outline btn-sm">Go</button>
      </form>
      @if (result && result.facets.price.max > 0) {
        <p class="hint">Prices in this view: {{ result.facets.price.min | price }} to {{ result.facets.price.max | price }}</p>
      }
    </section>

    <section class="group">
      <label class="check">
        <input type="checkbox" [checked]="params.inStock" (change)="changed.emit({ inStock: params.inStock ? undefined : true })" />
        <span class="text">In stock only</span>
        @if (result) {
          <span class="count">{{ result.facets.inStock }}</span>
        }
      </label>
    </section>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 28px; }
    h3 { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .group { display: flex; flex-direction: column; gap: 9px; }
    .check { font-size: 14px; }
    .text { flex: 1; }
    .count { font-size: 12px; color: var(--faint); font-variant-numeric: tabular-nums; }
    .none { font-size: 13px; color: var(--faint); }
    .more {
      align-self: flex-start; padding: 0; border: 0; background: none;
      font-size: 13px; color: var(--muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer;
    }
    .price { display: flex; align-items: center; gap: 6px; }
    .price label { flex: 1; min-width: 0; }
    .price .input { height: 34px; padding: 0 8px; font-size: 13px; }
    .dash { color: var(--faint); }
    .hint { margin-top: 2px; }
  `]
})
export class FiltersComponent implements OnChanges {
  @Input({ required: true }) params!: SearchParams;
  @Input() result: SearchResult | null = null;
  @Output() changed = new EventEmitter<Partial<SearchParams>>();

  readonly brandLimit = 8;
  showAllBrands = false;
  min: number | null = null;
  max: number | null = null;
  categories: FacetValue[] = [];
  brands: FacetValue[] = [];

  get visibleBrands(): FacetValue[] {
    return this.showAllBrands ? this.brands : this.brands.slice(0, this.brandLimit);
  }


  ngOnChanges(): void {
    this.min = this.params.minPrice ?? null;
    this.max = this.params.maxPrice ?? null;
    // Selected values stay visible even when the current search has no
    // matches for them, otherwise there would be no way to untick them.
    this.categories = this.withSelected(this.result?.facets.categories ?? [], this.params.category ?? []);
    this.brands = this.withSelected(this.result?.facets.brands ?? [], this.params.brand ?? []);
  }

  isOn(kind: 'category' | 'brand', value: string): boolean {
    return (this.params[kind] ?? []).some((v) => v.toLowerCase() === value.toLowerCase());
  }

  toggle(kind: 'category' | 'brand', value: string): void {
    const current = this.params[kind] ?? [];
    const next = this.isOn(kind, value)
      ? current.filter((v) => v.toLowerCase() !== value.toLowerCase())
      : [...current, value];
    this.changed.emit({ [kind]: next });
  }

  applyPrice(event: Event): void {
    event.preventDefault();
    const clean = (v: number | null) => (v === null || (v as unknown) === '' || Number.isNaN(Number(v)) || v < 0 ? null : Number(v));
    this.changed.emit({ minPrice: clean(this.min), maxPrice: clean(this.max) });
  }

  private withSelected(facets: FacetValue[], selected: string[]): FacetValue[] {
    const missing = selected
      .filter((s) => !facets.some((f) => f.value.toLowerCase() === s.toLowerCase()))
      .map((value) => ({ value, count: 0 }));
    return [...facets, ...missing];
  }
}
