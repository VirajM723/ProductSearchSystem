export interface Product {
  _id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  tags: string[];
  inStock: boolean;
  rating?: number | null;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductInput = Omit<Product, '_id' | 'createdAt' | 'updatedAt'>;

export type SortOption = 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'name';

export interface SearchParams {
  q?: string;
  category?: string[];
  brand?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  sort: SortOption;
  query: string;
  didYouMean: string | null;
  facets: {
    categories: FacetValue[];
    brands: FacetValue[];
    price: { min: number; max: number };
    inStock: number;
  };
  took: number;
  source: 'elasticsearch' | 'database';
}

export interface Suggestions {
  products: Pick<Product, '_id' | 'name' | 'brand' | 'category' | 'price' | 'image' | 'inStock'>[];
  categories: FacetValue[];
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}
