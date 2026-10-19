import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

// Simple line drawings per category, used when a product has no photo.
const ICONS: Record<string, string> = {
  audio: 'M14 38v-6a18 18 0 0 1 36 0v6M10 38a3 3 0 0 1 3-3h4v16h-4a3 3 0 0 1-3-3zM54 38a3 3 0 0 0-3-3h-4v16h4a3 3 0 0 0 3-3z',
  apparel: 'M24 10 12 16 6 28l8 4 4-6v28h28V26l4 6 8-4-6-12-12-6c-1 4-4 7-8 7s-7-3-8-7z',
  footwear: 'M8 46V36c0-5 2-11 4-14h10l4 6c6 2 14 4 22 6 6 1 8 4 8 8v4zM8 40h48M30 30l-3 4M36 32l-3 4',
  kitchen: 'M14 22h30v20a10 10 0 0 1-10 10H24a10 10 0 0 1-10-10zM44 28h4a6 6 0 0 1 0 12h-4M24 8c-2 3 2 5 0 8M32 8c-2 3 2 5 0 8',
  home: 'M22 12h20l6 18H16zM32 30v20M22 52h20',
  electronics: 'M11 12h42a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3zM26 52h12M32 44v8',
  stationery: 'M44 10l10 10-28 28-12 2 2-12zM40 14l10 10M16 38l10 10',
  outdoors: 'M6 50 24 18l10 16 6-8 18 24zM20 50l8-10 6 10',
  fitness: 'M10 26v12M16 20v24M48 20v24M54 26v12M16 32h32',
  books: 'M32 18c-6-4-14-4-20-2v32c6-2 14-2 20 2 6-4 14-4 20-2V16c-6-2-14-2-20 2zM32 18v32',
  beauty: 'M27 8h10v8H27zM24 16h16l2 6v30a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V22zM22 32h20',
  default: 'M8 20 32 10l24 10v26L32 56 8 46zM8 20l24 10 24-10M32 30v26'
};

// More specific drawings, picked by a word in the product name.
const KEYWORD_ICONS: [RegExp, string][] = [
  [/earbud/i, 'M20 22a7 7 0 1 1 7 7v14a3 3 0 0 1-6 0V29.5M44 22a7 7 0 1 0-7 7v14a3 3 0 0 0 6 0V29.5'],
  [/speaker/i, 'M18 8h28a3 3 0 0 1 3 3v42a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3zM32 30a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM32 16v2'],
  [/keyboard/i, 'M8 20h48a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V23a3 3 0 0 1 3-3zM13 27h2M20 27h2M27 27h2M34 27h2M41 27h2M48 27h2M15 33h2M22 33h2M29 33h2M36 33h2M43 33h2M20 38h24'],
  [/mouse/i, 'M32 8c-9 0-14 7-14 16v14c0 10 6 18 14 18s14-8 14-18V24c0-9-5-16-14-16zM32 8v14M18 26h28'],
  [/watch/i, 'M24 18l2-10h12l2 10M24 46l2 10h12l2-10M32 18a14 14 0 1 1 0 28 14 14 0 0 1 0-28zM32 26v6l4 3'],
  [/power bank|charger/i, 'M20 8h24a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4zM34 20l-6 12h8l-6 12'],
  [/skillet|\bpan\b/i, 'M10 30h28a14 14 0 0 1-28 0zM38 32h16'],
  [/knife/i, 'M10 44 46 12c4 0 6 3 4 6L22 46M10 44l4 4 8-2M40 26l14 14'],
  [/dinner|plate/i, 'M32 12a20 20 0 1 1 0 40 20 20 0 0 1 0-40zM32 20a12 12 0 1 1 0 24 12 12 0 0 1 0-24z'],
  [/grinder/i, 'M22 22h20l-2 30H24zM20 22h24M28 22l-2-8h12l-2 8M32 10V6M32 6h8'],
  [/planter|plant/i, 'M20 34h24l-4 22H24zM32 34V20M32 26c-8 0-12-6-12-12 8 0 12 6 12 12zM32 22c0-8 5-12 12-12 0 8-5 12-12 12z'],
  [/candle/i, 'M22 28h20v26H22zM32 28v-6M32 10c-4 5-4 9 0 12 4-3 4-7 0-12z'],
  [/blanket|throw|towel/i, 'M12 16h40v32H12zM12 26h40M12 38h40M18 48v6M26 48v6M34 48v6M42 48v6'],
  [/bedding/i, 'M8 44V20M56 44V30a6 6 0 0 0-6-6H24v14M8 38h48M8 44h48M14 32a4 4 0 1 0 8 0 4 4 0 0 0-8 0'],
  [/bottle/i, 'M26 6h12v6H26zM24 14h16v4l2 4v30a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V22l2-4z'],
  [/backpack|daypack/i, 'M20 18a12 12 0 0 1 24 0v34a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4zM26 12V8h12v4M24 34h16v10H24z'],
  [/tent/i, 'M6 52 32 12l26 40zM32 12v40M24 52l8-14 8 14'],
  [/yoga|mat\b/i, 'M14 18h30a8 8 0 0 1 0 16H14zM14 18a8 8 0 0 0 0 16v12h34M44 26h0'],
  [/notebook|journal/i, 'M16 8h32v48H16zM22 8v48M28 20h14M28 26h10'],
  [/boot/i, 'M16 8h16v24l16 6c4 1 8 4 8 8v4H16zM16 50h40v6H16z'],
  [/sweater|jacket/i, 'M22 10h20l12 8-4 14-6-2v26H20V30l-6 2-4-14zM26 10a6 6 0 0 0 12 0M32 16v40'],
  [/sunscreen|moisturi/i, 'M24 8h16l2 8v36a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V16zM22 26h20'],
  [/cookbook|handbook|book/i, 'M14 10h30a4 4 0 0 1 4 4v42H18a4 4 0 0 1-4-4zM14 50a4 4 0 0 1 4-4h30M24 20h14']
];

const TINTS: [string, string][] = [
  ['#ece4d6', '#7f6a4f'], // sand
  ['#dfe6dc', '#4c6a50'], // sage
  ['#eddcd2', '#965a42'], // clay
  ['#dde3e8', '#4b5d6e'], // slate
  ['#e9e5d6', '#6a6640'], // olive
  ['#eadfe4', '#7e5368'], // plum
  ['#e2e6e3', '#55605a']  // stone
];

const CATEGORY_TINT: Record<string, number> = {
  audio: 3, apparel: 0, footwear: 2, kitchen: 4, home: 0, electronics: 3,
  stationery: 6, outdoors: 1, fitness: 2, books: 5, beauty: 5
};

function hash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

@Component({
  selector: 'app-product-art',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="art" [style.background]="tint()[0]" [style.color]="tint()[1]" [class.compact]="compact">
      @if (image && !broken()) {
        <img [src]="image" [alt]="name" loading="lazy" (error)="broken.set(true)" />
      } @else {
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path [attr.d]="icon()" />
        </svg>
        @if (!compact) {
          <span class="label">{{ category }}</span>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .art {
      position: relative;
      aspect-ratio: 1 / 1;
      display: grid;
      place-items: center;
      border-radius: var(--radius);
      overflow: hidden;
    }
    img { width: 100%; height: 100%; object-fit: cover; }
    svg {
      width: 34%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: .85;
      transition: transform .4s ease;
    }
    .compact svg { width: 52%; stroke-width: 2; }
    .label {
      position: absolute;
      left: 12px;
      bottom: 10px;
      font-size: 11px;
      letter-spacing: .08em;
      text-transform: uppercase;
      opacity: .7;
    }
  `]
})
export class ProductArtComponent {
  @Input() set category(value: string) {
    this._category.set(value || '');
  }
  get category(): string {
    return this._category();
  }
  @Input() set name(value: string) {
    this._name.set(value || '');
  }
  get name(): string {
    return this._name();
  }
  @Input() image?: string;
  @Input() compact = false;

  private _category = signal('');
  private _name = signal('');
  readonly broken = signal(false);

  readonly icon = computed(() => {
    const byName = KEYWORD_ICONS.find(([pattern]) => pattern.test(this._name()));
    return byName ? byName[1] : ICONS[this._category().toLowerCase()] ?? ICONS['default'];
  });
  readonly tint = computed(() => {
    const key = this._category().toLowerCase();
    const index = CATEGORY_TINT[key] ?? hash(key) % TINTS.length;
    return TINTS[index];
  });
}
