import { ParamMap, Params } from '@angular/router';
import { SearchParams, SortOption } from '../../core/models';

export const PAGE_SIZE = 12;

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: 'Best match',
  newest: 'Newest',
  price_asc: 'Price, low to high',
  price_desc: 'Price, high to low',
  rating: 'Top rated',
  name: 'Name, A to Z'
};

const list = (value: string | null) =>
  (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);

const num = (value: string | null) => {
  if (value === null || value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

// The URL is the single source of truth for the shop page, so filtered
// views can be bookmarked, shared and navigated with the back button.
export function fromQuery(map: ParamMap): SearchParams {
  const sort = map.get('sort') as SortOption | null;
  const page = Number(map.get('page'));
  return {
    q: (map.get('q') ?? '').trim(),
    category: list(map.get('category')),
    brand: list(map.get('brand')),
    minPrice: num(map.get('min')),
    maxPrice: num(map.get('max')),
    inStock: map.get('stock') === '1',
    sort: sort && sort in SORT_LABELS ? sort : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    limit: PAGE_SIZE
  };
}

export function toQuery(p: SearchParams): Params {
  return {
    q: p.q || null,
    category: p.category?.length ? p.category.join(',') : null,
    brand: p.brand?.length ? p.brand.join(',') : null,
    min: p.minPrice ?? null,
    max: p.maxPrice ?? null,
    stock: p.inStock ? '1' : null,
    sort: p.sort && p.sort !== 'relevance' ? p.sort : null,
    page: p.page && p.page > 1 ? p.page : null
  };
}

export function hasFilters(p: SearchParams): boolean {
  return !!(p.category?.length || p.brand?.length || p.minPrice != null || p.maxPrice != null || p.inStock);
}
