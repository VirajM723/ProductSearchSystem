import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from './core/cart.service';
import { ToastService } from './core/toast.service';
import { CartDrawerComponent } from './pages/cart/cart-drawer.component';
import { SearchBoxComponent } from './shared/search-box.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SearchBoxComponent, CartDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#main">Skip to content</a>

    <div class="notice">Free delivery on orders over ₹2,500 &middot; Easy 30 day returns</div>

    <header class="header">
      <div class="shell bar">
        <a routerLink="/" class="logo" aria-label="Common Goods home">
          Common Goods
        </a>

        <app-search-box class="search" />

        <nav class="nav" aria-label="Main">
          <a routerLink="/" routerLinkActive="current" [routerLinkActiveOptions]="{ exact: true }">Shop</a>
          <a routerLink="/manage" routerLinkActive="current">Manage</a>
          <button type="button" class="bag" (click)="cart.open.set(true)" [attr.aria-label]="'Open bag, ' + cart.count() + ' items'">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>
            <span>Bag</span>
            @if (cart.count() > 0) {
              <span class="badge">{{ cart.count() }}</span>
            }
          </button>
        </nav>
      </div>
    </header>

    <main id="main">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="shell cols">
        <div>
          <p class="logo small">Common Goods</p>
          <p class="muted">Well made things for everyday use. Fewer, better.</p>
        </div>
        <div>
          <p class="heading">Shop</p>
          <a routerLink="/" [queryParams]="{ category: 'Home' }">Home</a>
          <a routerLink="/" [queryParams]="{ category: 'Kitchen' }">Kitchen</a>
          <a routerLink="/" [queryParams]="{ category: 'Apparel' }">Apparel</a>
          <a routerLink="/" [queryParams]="{ category: 'Audio' }">Audio</a>
        </div>
        <div>
          <p class="heading">Good to know</p>
          <span>Delivery in 3 to 5 days</span>
          <span>30 day returns</span>
          <span>Pay on delivery</span>
        </div>
        <div>
          <p class="heading">Store</p>
          <a routerLink="/manage">Inventory</a>
          <a routerLink="/manage/new">Add a product</a>
        </div>
      </div>
      <div class="shell legal">
        <span>&copy; {{ year }} Common Goods</span>
        <span>Prices include GST</span>
      </div>
    </footer>

    <app-cart-drawer />

    <div class="toasts" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class.error]="toast.tone === 'error'" (click)="toasts.dismiss(toast.id)">{{ toast.text }}</div>
      }
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; }
    .skip { position: absolute; left: -999px; }
    .skip:focus { left: 16px; top: 8px; z-index: 100; background: var(--surface); padding: 8px 12px; }
    .notice {
      background: var(--accent);
      color: #e9eee9;
      font-size: 12px;
      text-align: center;
      padding: 7px 16px;
      letter-spacing: .02em;
    }
    .header {
      position: sticky; top: 0; z-index: 20;
      background: rgba(250, 248, 245, .92);
      backdrop-filter: saturate(1.4) blur(10px);
      border-bottom: 1px solid var(--border);
    }
    .bar { display: flex; align-items: center; gap: 32px; height: 68px; }
    .logo {
      font-family: var(--serif);
      font-size: 26px;
      letter-spacing: -.01em;
      text-decoration: none;
      white-space: nowrap;
    }
    .logo.small { font-size: 22px; margin-bottom: 8px; }
    .search { flex: 1; max-width: 520px; }
    .nav { display: flex; align-items: center; gap: 24px; margin-left: auto; font-size: 14px; }
    .nav a { text-decoration: none; color: var(--muted); }
    .nav a:hover, .nav a.current { color: var(--text); }
    .bag {
      position: relative; display: flex; align-items: center; gap: 6px;
      padding: 8px 4px; border: 0; background: none; cursor: pointer; font-size: 14px;
    }
    .bag svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; }
    .badge {
      min-width: 18px; height: 18px; padding: 0 5px;
      display: grid; place-items: center;
      background: var(--text); color: var(--bg);
      border-radius: 99px; font-size: 11px; font-weight: 600;
    }
    .footer { margin-top: 96px; border-top: 1px solid var(--border); padding: 48px 0 32px; font-size: 14px; }
    .cols { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 32px; }
    .cols > div { display: flex; flex-direction: column; gap: 8px; }
    .cols a { text-decoration: none; color: var(--muted); }
    .cols a:hover { color: var(--text); }
    .cols span { color: var(--muted); }
    .heading { font-weight: 500; margin-bottom: 4px; }
    .muted { color: var(--muted); max-width: 280px; }
    .legal { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; color: var(--faint); }
    .toasts {
      position: fixed; z-index: 60; left: 50%; bottom: 24px; translate: -50% 0;
      display: flex; flex-direction: column; gap: 8px; align-items: center;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      background: var(--text); color: var(--bg);
      padding: 10px 16px; border-radius: 8px; font-size: 14px;
      box-shadow: 0 8px 24px -8px rgba(0,0,0,.3);
      animation: rise .2s ease-out;
      cursor: pointer;
      max-width: calc(100vw - 32px);
    }
    .toast.error { background: var(--danger); color: #fff; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }

    @media (max-width: 860px) {
      .bar { flex-wrap: wrap; height: auto; padding-top: 12px; padding-bottom: 12px; gap: 12px 20px; }
      .search { order: 3; flex-basis: 100%; max-width: none; }
      .nav { gap: 18px; }
      .cols { grid-template-columns: 1fr 1fr; }
      .cols > div:first-child { grid-column: 1 / -1; }
    }
    @media (max-width: 420px) {
      .logo { font-size: 22px; }
      .bag span:not(.badge) { display: none; }
    }
  `]
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly toasts = inject(ToastService);
  readonly year = new Date().getFullYear();
}
