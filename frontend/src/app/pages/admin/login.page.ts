import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/product.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <div class="card">
        <p class="eyebrow">Staff</p>
        <h1 class="display">Sign in</h1>
        <p class="lede">The inventory is only open to store admins.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (error()) {
            <div class="banner" role="alert">{{ error() }}</div>
          }
          <div class="field">
            <label for="username">Username</label>
            <input id="username" class="input" formControlName="username" autocomplete="username" autocapitalize="none" spellcheck="false" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <div class="password">
              <input id="password" class="input" [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button type="button" class="toggle" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <a routerLink="/" class="back">← Back to the shop</a>
      </div>
    </div>
  `,
  styles: [`
    .shell { display: flex; justify-content: center; padding-top: 80px; }
    .card { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 10px; }
    h1 { font-size: 48px; }
    .lede { color: var(--muted); margin-bottom: 18px; }
    form { display: flex; flex-direction: column; gap: 16px; }
    .password { position: relative; }
    .password .input { padding-right: 64px; }
    .toggle {
      position: absolute; right: 6px; top: 50%; translate: 0 -50%;
      height: 30px; padding: 0 10px; border: 0; border-radius: 4px; background: none;
      font-size: 12px; color: var(--muted); cursor: pointer;
    }
    .toggle:hover { background: var(--sunken); color: var(--text); }
    .banner { padding: 10px 12px; border-radius: var(--radius); background: var(--danger-soft); color: var(--danger); font-size: 14px; }
    .btn-block { margin-top: 6px; }
    .back { margin-top: 20px; font-size: 14px; color: var(--muted); text-decoration: none; }
    .back:hover { color: var(--text); }
  `]
})
export class LoginPage implements OnInit {
  @Input() next?: string;

  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  ngOnInit(): void {
    // Already signed in? Skip the form.
    this.auth.check().subscribe((ok) => {
      if (ok) this.router.navigateByUrl(this.target());
    });
  }

  submit(): void {
    const { username, password } = this.form.getRawValue();
    if (!username.trim() || !password) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(username.trim(), password).subscribe({
      next: () => this.router.navigateByUrl(this.target()),
      error: (err) => {
        this.busy.set(false);
        this.form.controls.password.reset();
        this.error.set(errorMessage(err));
      }
    });
  }

  // Only follow local paths, so ?next= can't send someone to another site.
  private target(): string {
    const next = this.next ?? '';
    return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/manage';
  }
}
