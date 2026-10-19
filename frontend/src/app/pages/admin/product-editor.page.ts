import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, startWith } from 'rxjs';
import { Product, ProductInput } from '../../core/models';
import { ProductService, errorMessage, fieldErrors } from '../../core/product.service';
import { ToastService } from '../../core/toast.service';
import { ProductCardComponent } from '../../shared/product-card.component';

const urlOrEmpty = (control: AbstractControl): ValidationErrors | null =>
  !control.value || /^https?:\/\/\S+$/i.test(control.value) ? null : { url: true };

const notBlank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() === '' ? { required: true } : null;

@Component({
  selector: 'app-product-editor-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <a routerLink="/manage" class="back">← Inventory</a>
      <h1 class="display">{{ id ? 'Edit product' : 'New product' }}</h1>

      @if (loadError()) {
        <div class="load-error">
          <p>{{ loadError() }}</p>
          <a routerLink="/manage" class="btn btn-outline">Back to inventory</a>
        </div>
      } @else if (id && !loaded()) {
        <div class="skeleton" style="height: 520px"></div>
      } @else {
        <div class="layout">
          <form [formGroup]="form" (ngSubmit)="save()" novalidate>
            @if (formError()) {
              <div class="banner" role="alert">{{ formError() }}</div>
            }

            <div class="field">
              <label for="name">Name</label>
              <input id="name" class="input" formControlName="name" maxlength="160" [class.invalid]="problem('name')" />
              @if (problem('name'); as msg) { <span class="error-text">{{ msg }}</span> }
            </div>

            <div class="field">
              <label for="description">Description</label>
              <textarea id="description" class="textarea" formControlName="description" rows="5" maxlength="4000" [class.invalid]="problem('description')"></textarea>
              @if (problem('description'); as msg) { <span class="error-text">{{ msg }}</span> }
            </div>

            <div class="two">
              <div class="field">
                <label for="category">Category</label>
                <input id="category" class="input" formControlName="category" list="category-options" maxlength="60" [class.invalid]="problem('category')" />
                <datalist id="category-options">
                  @for (c of meta().categories; track c) { <option [value]="c"></option> }
                </datalist>
                @if (problem('category'); as msg) { <span class="error-text">{{ msg }}</span> }
              </div>
              <div class="field">
                <label for="brand">Brand</label>
                <input id="brand" class="input" formControlName="brand" list="brand-options" maxlength="60" [class.invalid]="problem('brand')" />
                <datalist id="brand-options">
                  @for (b of meta().brands; track b) { <option [value]="b"></option> }
                </datalist>
                @if (problem('brand'); as msg) { <span class="error-text">{{ msg }}</span> }
              </div>
            </div>

            <div class="two">
              <div class="field">
                <label for="price">Price (₹)</label>
                <input id="price" class="input" type="number" min="0" step="0.01" formControlName="price" [class.invalid]="problem('price')" />
                @if (problem('price'); as msg) { <span class="error-text">{{ msg }}</span> }
              </div>
              <div class="field">
                <label for="rating">Rating <span class="optional">optional</span></label>
                <input id="rating" class="input" type="number" min="0" max="5" step="0.1" formControlName="rating" [class.invalid]="problem('rating')" />
                @if (problem('rating'); as msg) { <span class="error-text">{{ msg }}</span> }
              </div>
            </div>

            <div class="field">
              <label for="tags">Tags <span class="optional">optional</span></label>
              <input id="tags" class="input" formControlName="tags" placeholder="wireless, travel, gift" [class.invalid]="problem('tags')" />
              <span class="hint">Separate with commas. Tags are searchable.</span>
              @if (problem('tags'); as msg) { <span class="error-text">{{ msg }}</span> }
            </div>

            <div class="field">
              <label for="image">Image URL <span class="optional">optional</span></label>
              <input id="image" class="input" type="url" formControlName="image" placeholder="https://" [class.invalid]="problem('image')" />
              <span class="hint">Leave empty to use the category illustration.</span>
              @if (problem('image'); as msg) { <span class="error-text">{{ msg }}</span> }
            </div>

            <label class="check">
              <input type="checkbox" formControlName="inStock" />
              <span>In stock</span>
            </label>

            <div class="buttons">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                {{ saving() ? 'Saving…' : id ? 'Save changes' : 'Create product' }}
              </button>
              <a routerLink="/manage" class="btn btn-ghost">Cancel</a>
            </div>
          </form>

          <aside class="preview">
            <p class="eyebrow">Preview</p>
            <app-product-card [product]="preview()" />
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-top: 32px; font-size: 14px; color: var(--muted); text-decoration: none; }
    .back:hover { color: var(--text); }
    h1 { font-size: 48px; margin: 12px 0 32px; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 64px; align-items: start; }
    form { display: flex; flex-direction: column; gap: 20px; max-width: 640px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .optional { font-weight: 400; color: var(--faint); margin-left: 4px; }
    .buttons { display: flex; gap: 8px; margin-top: 8px; }
    .banner { padding: 12px 14px; border-radius: var(--radius); background: var(--danger-soft); color: var(--danger); font-size: 14px; }
    .preview { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 14px; }
    .load-error { display: flex; flex-direction: column; gap: 16px; align-items: flex-start; color: var(--muted); }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .preview { display: none; }
      h1 { font-size: 40px; }
    }
    @media (max-width: 520px) {
      .two { grid-template-columns: 1fr; }
    }
  `]
})
export class ProductEditorPage implements OnInit {
  @Input() id?: string;

  private api = inject(ProductService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly loaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  private submitted = signal(false);

  readonly meta = toSignal(this.api.meta().pipe(catchError(() => of({ categories: [], brands: [] }))), {
    initialValue: { categories: [] as string[], brands: [] as string[] }
  });

  readonly form = this.fb.group({
    name: ['', [Validators.required, notBlank, Validators.maxLength(160)]],
    description: ['', [Validators.required, notBlank, Validators.maxLength(4000)]],
    category: ['', [Validators.required, notBlank, Validators.maxLength(60)]],
    brand: ['', [Validators.required, notBlank, Validators.maxLength(60)]],
    price: [null as number | null, [Validators.required, Validators.min(0), Validators.max(10000000)]],
    rating: [null as number | null, [Validators.min(0), Validators.max(5)]],
    tags: [''],
    image: ['', [urlOrEmpty]],
    inStock: [true]
  });

  private formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)));

  readonly preview = (): Product => {
    const v = this.formValue() ?? {};
    return {
      _id: this.id ?? 'preview',
      name: v.name?.trim() || 'Product name',
      description: v.description ?? '',
      category: v.category?.trim() || 'Category',
      brand: v.brand?.trim() || 'Brand',
      price: Number(v.price) || 0,
      rating: v.rating ? Number(v.rating) : null,
      tags: [],
      image: urlOrEmpty({ value: v.image } as AbstractControl) ? '' : v.image ?? '',
      inStock: v.inStock ?? true
    };
  };

  ngOnInit(): void {
    // Clear a server error as soon as the field is edited.
    for (const [key, control] of Object.entries(this.form.controls) as [string, AbstractControl][]) {
      control.valueChanges.subscribe(() => {
        if (this.serverErrors()[key]) {
          const { [key]: _, ...rest } = this.serverErrors();
          this.serverErrors.set(rest);
        }
      });
    }

    if (!this.id) return;
    this.api.get(this.id).subscribe({
      next: (p) => {
        this.form.setValue({
          name: p.name,
          description: p.description,
          category: p.category,
          brand: p.brand,
          price: p.price,
          rating: p.rating ?? null,
          tags: p.tags.join(', '),
          image: p.image ?? '',
          inStock: p.inStock
        });
        this.loaded.set(true);
      },
      error: (err) => this.loadError.set(err?.status === 404 || err?.status === 400 ? 'That product no longer exists.' : errorMessage(err))
    });
  }

  problem(name: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[name];
    if (server) return server;

    const control = this.form.controls[name];
    if (!control.invalid || !(control.touched || this.submitted())) return null;
    const e = control.errors ?? {};
    if (e['required']) return 'This field is required';
    if (e['maxlength']) return `Keep it under ${e['maxlength'].requiredLength} characters`;
    if (e['min']) return name === 'rating' ? 'Rating must be between 0 and 5' : 'Must be 0 or more';
    if (e['max']) return name === 'rating' ? 'Rating must be between 0 and 5' : 'That looks too high';
    if (e['url']) return 'Use a full link starting with http:// or https://';
    return 'Check this value';
  }

  save(): void {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => document.querySelector<HTMLElement>('form .invalid')?.focus());
      return;
    }

    const v = this.form.getRawValue();
    const input: ProductInput = {
      name: v.name!.trim(),
      description: v.description!.trim(),
      category: v.category!.trim(),
      brand: v.brand!.trim(),
      price: Number(v.price),
      rating: v.rating === null || (v.rating as unknown) === '' ? null : Number(v.rating),
      tags: (v.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      image: (v.image ?? '').trim(),
      inStock: !!v.inStock
    };

    this.saving.set(true);
    const request = this.id ? this.api.update(this.id, input) : this.api.create(input);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.show(saved.warning ?? (this.id ? 'Changes saved' : `${saved.name} created`));
        this.router.navigate(['/manage']);
      },
      error: (err) => {
        this.saving.set(false);
        const fields = fieldErrors(err);
        this.serverErrors.set(fields);
        this.formError.set(Object.keys(fields).length ? 'Some fields need another look.' : errorMessage(err));
      }
    });
  }
}
