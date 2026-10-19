import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap } from 'rxjs';
import { Suggestions } from '../core/models';
import { ProductService } from '../core/product.service';
import { PricePipe } from './price.pipe';
import { ProductArtComponent } from './product-art.component';

type Option =
  | { kind: 'query'; label: string }
  | { kind: 'category'; label: string; count: number }
  | { kind: 'product'; id: string; label: string; brand: string; category: string; price: number; image?: string };

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [FormsModule, PricePipe, ProductArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="search" role="search" (submit)="submit($event)">
      <svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="m14 14 4 4"/></svg>
      <input
        #input
        type="search"
        name="q"
        autocomplete="off"
        placeholder="Search products, brands, categories"
        aria-label="Search products"
        role="combobox"
        aria-controls="search-options"
        [attr.aria-expanded]="open()"
        [attr.aria-activedescendant]="active() >= 0 ? 'search-opt-' + active() : null"
        [ngModel]="text()"
        (ngModelChange)="onType($event)"
        (focus)="open.set(options().length > 0)"
        (keydown)="onKey($event)" />
      @if (text()) {
        <button type="button" class="clear" (click)="clear(input)" aria-label="Clear search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8M14 6l-8 8"/></svg>
        </button>
      }

      @if (open() && options().length) {
        <ul class="menu" id="search-options" role="listbox">
          @for (option of options(); track option.kind + option.label; let i = $index) {
            <li
              role="option"
              [id]="'search-opt-' + i"
              [class.active]="i === active()"
              [attr.aria-selected]="i === active()"
              (mousedown)="$event.preventDefault()"
              (click)="choose(option)"
              (mouseenter)="active.set(i)">
              @switch (option.kind) {
                @case ('query') {
                  <span class="muted">Search for</span>&nbsp;<strong>“{{ option.label }}”</strong>
                }
                @case ('category') {
                  <span class="muted">Browse</span>&nbsp;<strong>{{ option.label }}</strong>
                  <span class="count">{{ option.count }}</span>
                }
                @case ('product') {
                  <app-product-art class="thumb" [category]="option.category" [name]="option.label" [image]="option.image" [compact]="true" />
                  <span class="product">
                    <span class="name">{{ option.label }}</span>
                    <span class="muted small">{{ option.brand }}</span>
                  </span>
                  <span class="small">{{ option.price | price }}</span>
                }
              }
            </li>
          }
        </ul>
      }
    </form>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .search { position: relative; }
    .icon {
      position: absolute; left: 14px; top: 50%; translate: 0 -50%;
      width: 16px; height: 16px; fill: none; stroke: var(--muted); stroke-width: 1.6; stroke-linecap: round;
      pointer-events: none;
    }
    input {
      width: 100%;
      height: 42px;
      padding: 0 40px 0 40px;
      border: 1px solid var(--border);
      border-radius: 99px;
      background: var(--sunken);
      font-size: 14px;
      transition: background .15s, border-color .15s;
    }
    input::-webkit-search-cancel-button { display: none; }
    input::placeholder { color: var(--faint); }
    input:focus { outline: none; background: var(--surface); border-color: var(--border-strong); }
    .clear {
      position: absolute; right: 8px; top: 50%; translate: 0 -50%;
      width: 28px; height: 28px; display: grid; place-items: center;
      border: 0; border-radius: 99px; background: transparent; cursor: pointer;
    }
    .clear:hover { background: var(--border); }
    .clear svg { width: 14px; height: 14px; fill: none; stroke: var(--muted); stroke-width: 1.6; stroke-linecap: round; }
    .menu {
      position: absolute; z-index: 30; top: calc(100% + 6px); left: 0; right: 0;
      margin: 0; padding: 6px; list-style: none;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 12px 32px -12px rgba(29, 28, 26, .18);
    }
    li {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 6px; font-size: 14px; cursor: pointer;
    }
    li.active { background: var(--sunken); }
    .thumb { width: 36px; flex: none; }
    .product { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .muted { color: var(--muted); }
    .small { font-size: 12px; }
    .count { margin-left: auto; font-size: 12px; color: var(--faint); }
    strong { font-weight: 500; }
  `]
})
export class SearchBoxComponent implements OnInit, OnDestroy {
  private products = inject(ProductService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private host = inject(ElementRef<HTMLElement>);

  readonly text = signal('');
  readonly options = signal<Option[]>([]);
  readonly open = signal(false);
  readonly active = signal(-1);

  private typed = new Subject<string>();
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.typed
        .pipe(
          debounceTime(140),
          distinctUntilChanged(),
          switchMap((q) =>
            q.trim().length < 2
              ? of<Suggestions | null>(null)
              : this.products.suggest(q.trim()).pipe(catchError(() => of(null)))
          )
        )
        .subscribe((result) => this.setOptions(result))
    );

    // Keep the box in step with the URL, e.g. after pressing back.
    this.subs.add(
      this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
        const q = this.router.parseUrl(this.router.url).queryParams['q'] ?? '';
        const onShop = this.router.url === '/' || this.router.url.startsWith('/?');
        this.text.set(onShop ? q : this.text());
        this.open.set(false);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  onType(value: string): void {
    this.text.set(value);
    this.typed.next(value);
    if (!value.trim()) this.setOptions(null);
  }

  onKey(event: KeyboardEvent): void {
    const count = this.options().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.open.set(true);
      this.active.set((this.active() + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.set(this.active() <= 0 ? count - 1 : this.active() - 1);
    } else if (event.key === 'Escape') {
      this.open.set(false);
      this.active.set(-1);
    }
  }

  submit(event: Event): void {
    event.preventDefault();
    const option = this.options()[this.active()];
    if (this.open() && option) {
      this.choose(option);
    } else {
      this.go({ q: this.text().trim() || null });
    }
  }

  choose(option: Option): void {
    if (option.kind === 'product') {
      this.router.navigate(['/product', option.id]);
    } else if (option.kind === 'category') {
      this.text.set('');
      this.go({ q: null, category: option.label });
    } else {
      this.go({ q: option.label });
    }
    this.open.set(false);
  }

  clear(input: HTMLInputElement): void {
    this.onType('');
    input.focus();
    if (this.router.url.startsWith('/?')) this.go({ q: null });
  }

  private go(params: Record<string, string | null>): void {
    this.router.navigate(['/'], { queryParams: params });
    this.open.set(false);
    this.active.set(-1);
  }

  private setOptions(result: Suggestions | null): void {
    const q = this.text().trim();
    if (!result || !q) {
      this.options.set([]);
      this.open.set(false);
      return;
    }
    const options: Option[] = [
      { kind: 'query', label: q },
      ...result.categories.map((c) => ({ kind: 'category' as const, label: c.value, count: c.count })),
      ...result.products.map((p) => ({
        kind: 'product' as const,
        id: p._id,
        label: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        image: p.image
      }))
    ];
    this.options.set(options);
    this.active.set(-1);
    this.open.set(document.activeElement === this.host.nativeElement.querySelector('input'));
  }
}
