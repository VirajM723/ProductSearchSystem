import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';
import { PricePipe } from '../../shared/price.pipe';
import { ProductArtComponent } from '../../shared/product-art.component';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PricePipe, ProductArtComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      @if (orderNumber(); as number) {
        <div class="done">
          <p class="eyebrow">Order {{ number }}</p>
          <h1 class="display">Thanks, {{ firstName() }}.</h1>
          <p>We've got your order and will send updates to {{ email() }}. You'll pay when it arrives.</p>
          <a routerLink="/" class="btn btn-primary">Continue shopping</a>
        </div>
      } @else if (cart.lines().length === 0) {
        <div class="done">
          <h1 class="display">Your bag is empty</h1>
          <p>Add a few things first, then come back here to check out.</p>
          <a routerLink="/" class="btn btn-primary">Go to the shop</a>
        </div>
      } @else {
        <h1 class="display title">Checkout</h1>

        <div class="layout">
          <form [formGroup]="form" (ngSubmit)="placeOrder()" novalidate>
            <fieldset>
              <legend>Contact</legend>
              <div class="field">
                <label for="name">Full name</label>
                <input id="name" class="input" formControlName="name" autocomplete="name" [class.invalid]="bad('name')" />
                @if (bad('name')) { <span class="error-text">Please enter your name</span> }
              </div>
              <div class="two">
                <div class="field">
                  <label for="email">Email</label>
                  <input id="email" type="email" class="input" formControlName="email" autocomplete="email" [class.invalid]="bad('email')" />
                  @if (bad('email')) { <span class="error-text">Enter a valid email address</span> }
                </div>
                <div class="field">
                  <label for="phone">Phone</label>
                  <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" inputmode="numeric" [class.invalid]="bad('phone')" />
                  @if (bad('phone')) { <span class="error-text">Enter a 10 digit mobile number</span> }
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Delivery address</legend>
              <div class="field">
                <label for="address">Address</label>
                <input id="address" class="input" formControlName="address" autocomplete="street-address" [class.invalid]="bad('address')" />
                @if (bad('address')) { <span class="error-text">Please enter your address</span> }
              </div>
              <div class="two">
                <div class="field">
                  <label for="city">City</label>
                  <input id="city" class="input" formControlName="city" autocomplete="address-level2" [class.invalid]="bad('city')" />
                  @if (bad('city')) { <span class="error-text">Please enter a city</span> }
                </div>
                <div class="field">
                  <label for="pin">PIN code</label>
                  <input id="pin" class="input" formControlName="pin" autocomplete="postal-code" inputmode="numeric" maxlength="6" [class.invalid]="bad('pin')" />
                  @if (bad('pin')) { <span class="error-text">PIN codes are 6 digits</span> }
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>Payment</legend>
              <label class="check option">
                <input type="radio" name="payment" checked />
                <span>Cash or UPI on delivery</span>
              </label>
            </fieldset>

            <button type="submit" class="btn btn-primary btn-block">Place order · {{ cart.total() | price }}</button>
          </form>

          <aside class="summary">
            <h2>Order summary</h2>
            <ul>
              @for (line of cart.lines(); track line.id) {
                <li>
                  <app-product-art class="thumb" [category]="line.category" [name]="line.name" [image]="line.image" [compact]="true" />
                  <span class="name">{{ line.name }} <span class="muted">× {{ line.qty }}</span></span>
                  <span>{{ line.price * line.qty | price }}</span>
                </li>
              }
            </ul>
            <div class="row"><span>Subtotal</span><span>{{ cart.subtotal() | price }}</span></div>
            <div class="row"><span>Delivery</span><span>{{ cart.shipping() === 0 ? 'Free' : (cart.shipping() | price) }}</span></div>
            <div class="row total"><span>Total</span><span>{{ cart.total() | price }}</span></div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: [`
    .title { font-size: 48px; padding: 48px 0 32px; }
    .layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 64px; align-items: start; }
    form { display: flex; flex-direction: column; gap: 32px; }
    fieldset { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; }
    legend { font-weight: 600; font-size: 15px; margin-bottom: 16px; padding: 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .option { padding: 14px 16px; border: 1px solid var(--text); border-radius: var(--radius); background: var(--surface); }
    .summary { position: sticky; top: 96px; padding: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
    .summary h2 { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    ul { list-style: none; margin: 0 0 16px; padding: 0; }
    li { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; padding: 10px 0; font-size: 14px; border-bottom: 1px solid var(--border); }
    .name { min-width: 0; }
    .muted { color: var(--muted); }
    .row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: var(--muted); font-variant-numeric: tabular-nums; }
    .row.total { color: var(--text); font-weight: 600; font-size: 16px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
    .done { max-width: 520px; padding: 96px 0; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
    .done h1 { font-size: 52px; }
    .done p:not(.eyebrow) { color: var(--muted); font-size: 16px; }
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; gap: 32px; }
      .summary { position: static; order: -1; }
      .title { font-size: 40px; padding: 32px 0 24px; }
    }
    @media (max-width: 520px) {
      .two { grid-template-columns: 1fr; }
    }
  `]
})
export class CheckoutPage {
  readonly cart = inject(CartService);
  private fb = inject(FormBuilder);

  readonly orderNumber = signal<string | null>(null);
  readonly firstName = signal('');
  readonly email = signal('');
  private submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^(\+91[\s-]?)?[6-9]\d{9}$/)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.maxLength(60)]],
    pin: ['', [Validators.required, Validators.pattern(/^[1-9]\d{5}$/)]]
  });

  bad(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  placeOrder(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Wait for the error styles to render, then jump to the first problem.
      setTimeout(() => document.querySelector<HTMLElement>('form .invalid')?.focus());
      return;
    }
    const { name, email } = this.form.getRawValue();
    this.firstName.set(name.trim().split(/\s+/)[0]);
    this.email.set(email);
    this.orderNumber.set(`CG-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    this.cart.clear();
    window.scrollTo({ top: 0 });
  }
}
