import { ChangeDetectionStrategy, Component, HostListener, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { PricePipe } from '../../shared/price.pipe';
import { ProductArtComponent } from '../../shared/product-art.component';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [RouterLink, PricePipe, ProductArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cart.open()) {
      <div class="scrim" (click)="close()"></div>
    }
    <aside class="drawer" [class.open]="cart.open()" role="dialog" aria-modal="true" aria-label="Your bag" [attr.aria-hidden]="!cart.open()" [attr.inert]="cart.open() ? null : ''">
      <header>
        <h2>Your bag <span>{{ cart.count() }}</span></h2>
        <button type="button" class="close" (click)="close()" aria-label="Close bag">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
        </button>
      </header>

      @if (cart.lines().length === 0) {
        <div class="empty">
          <p>Your bag is empty.</p>
          <button type="button" class="btn btn-outline" (click)="close()">Keep shopping</button>
        </div>
      } @else {
        <ul class="lines">
          @for (line of cart.lines(); track line.id) {
            <li>
              <a [routerLink]="['/product', line.id]" (click)="close()" class="thumb">
                <app-product-art [category]="line.category" [name]="line.name" [image]="line.image" [compact]="true" />
              </a>
              <div class="line-info">
                <a [routerLink]="['/product', line.id]" (click)="close()" class="name">{{ line.name }}</a>
                <span class="brand">{{ line.brand }}</span>
                <div class="controls">
                  <div class="qty">
                    <button type="button" (click)="cart.setQty(line.id, line.qty - 1)" [attr.aria-label]="'Decrease ' + line.name">−</button>
                    <span>{{ line.qty }}</span>
                    <button type="button" (click)="cart.setQty(line.id, line.qty + 1)" [disabled]="line.qty >= cart.maxQty" [attr.aria-label]="'Increase ' + line.name">+</button>
                  </div>
                  <button type="button" class="remove" (click)="cart.remove(line.id)">Remove</button>
                </div>
              </div>
              <span class="line-price">{{ line.price * line.qty | price }}</span>
            </li>
          }
        </ul>

        <footer>
          <div class="row"><span>Subtotal</span><span>{{ cart.subtotal() | price }}</span></div>
          <div class="row muted">
            <span>Delivery</span>
            <span>{{ cart.shipping() === 0 ? 'Free' : (cart.shipping() | price) }}</span>
          </div>
          @if (cart.shipping() > 0) {
            <p class="nudge">Add {{ 2500 - cart.subtotal() | price }} more for free delivery.</p>
          }
          <button type="button" class="btn btn-primary btn-block" (click)="checkout()">Checkout · {{ cart.total() | price }}</button>
        </footer>
      }
    </aside>
  `,
  styles: [`
    .scrim { position: fixed; inset: 0; z-index: 70; background: rgba(29, 28, 26, .3); animation: fade .2s; }
    @keyframes fade { from { opacity: 0; } }
    .drawer {
      position: fixed; z-index: 80; top: 0; right: 0; bottom: 0;
      width: min(420px, 100vw);
      display: flex; flex-direction: column;
      background: var(--bg);
      transform: translateX(100%);
      transition: transform .28s cubic-bezier(.2, .8, .2, 1);
      visibility: hidden;
    }
    .drawer.open { transform: none; visibility: visible; box-shadow: -20px 0 60px -20px rgba(0,0,0,.2); }
    header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    h2 { font-size: 18px; font-weight: 500; }
    h2 span { color: var(--faint); font-weight: 400; margin-left: 4px; }
    .close { width: 36px; height: 36px; display: grid; place-items: center; border: 0; background: none; border-radius: 50%; cursor: pointer; }
    .close:hover { background: var(--sunken); }
    .close svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; }
    .empty { padding: 48px 24px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; color: var(--muted); }
    .lines { flex: 1; overflow-y: auto; margin: 0; padding: 8px 24px; list-style: none; }
    li { display: grid; grid-template-columns: 72px 1fr auto; gap: 14px; padding: 16px 0; border-bottom: 1px solid var(--border); }
    .thumb { display: block; }
    .line-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .name { font-size: 14px; text-decoration: none; }
    .name:hover { text-decoration: underline; text-underline-offset: 3px; }
    .brand { font-size: 12px; color: var(--muted); }
    .controls { display: flex; align-items: center; gap: 14px; margin-top: 8px; }
    .qty { display: flex; align-items: center; border: 1px solid var(--border); border-radius: var(--radius); height: 30px; }
    .qty button { width: 28px; height: 100%; border: 0; background: none; cursor: pointer; }
    .qty button:disabled { color: var(--faint); cursor: default; }
    .qty span { min-width: 18px; text-align: center; font-size: 13px; font-variant-numeric: tabular-nums; }
    .remove { border: 0; background: none; padding: 0; font-size: 12px; color: var(--muted); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
    .line-price { font-size: 14px; font-variant-numeric: tabular-nums; }
    footer { padding: 20px 24px 24px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; background: var(--surface); }
    .row { display: flex; justify-content: space-between; font-size: 14px; font-variant-numeric: tabular-nums; }
    .row.muted { color: var(--muted); }
    .nudge { font-size: 12px; color: var(--accent); }
    footer .btn { margin-top: 10px; }
  `]
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  private router = inject(Router);

  constructor() {
    // Stop the page behind from scrolling while the bag is open.
    effect(() => {
      document.body.style.overflow = this.cart.open() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.cart.open.set(false);
  }

  checkout(): void {
    this.close();
    this.router.navigate(['/checkout']);
  }
}
