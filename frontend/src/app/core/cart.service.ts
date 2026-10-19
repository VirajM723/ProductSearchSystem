import { Injectable, computed, effect, signal } from '@angular/core';
import { Product } from './models';

export interface CartLine {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  image?: string;
  qty: number;
}

const STORAGE_KEY = 'cg.cart';
const MAX_QTY = 10;

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === 'string' && l.qty > 0) : [];
  } catch {
    return [];
  }
}

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly lines = signal<CartLine[]>(load());
  readonly open = signal(false);

  readonly count = computed(() => this.lines().reduce((n, l) => n + l.qty, 0));
  readonly subtotal = computed(() => this.lines().reduce((sum, l) => sum + l.price * l.qty, 0));
  readonly shipping = computed(() => (this.subtotal() === 0 || this.subtotal() >= 2500 ? 0 : 99));
  readonly total = computed(() => this.subtotal() + this.shipping());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lines()));
      } catch {
        // Private mode or storage full; the cart still works for this visit.
      }
    });
  }

  add(product: Product, qty = 1): void {
    this.lines.update((lines) => {
      const existing = lines.find((l) => l.id === product._id);
      if (existing) {
        return lines.map((l) => (l === existing ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l));
      }
      return [
        ...lines,
        {
          id: product._id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          price: product.price,
          image: product.image,
          qty: Math.min(MAX_QTY, qty)
        }
      ];
    });
  }

  setQty(id: string, qty: number): void {
    if (qty <= 0) return this.remove(id);
    this.lines.update((lines) => lines.map((l) => (l.id === id ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)));
  }

  remove(id: string): void {
    this.lines.update((lines) => lines.filter((l) => l.id !== id));
  }

  clear(): void {
    this.lines.set([]);
  }

  qtyOf(id: string): number {
    return this.lines().find((l) => l.id === id)?.qty ?? 0;
  }

  readonly maxQty = MAX_QTY;
}
