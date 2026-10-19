import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="shell">
      <p class="eyebrow">404</p>
      <h1 class="display">We can't find that page.</h1>
      <p>The link may be old, or the page has moved.</p>
      <a routerLink="/" class="btn btn-primary">Go to the shop</a>
    </div>
  `,
  styles: [`
    .shell { padding-top: 96px; display: flex; flex-direction: column; gap: 16px; align-items: flex-start; }
    h1 { font-size: clamp(40px, 6vw, 64px); }
    p:not(.eyebrow) { color: var(--muted); }
  `]
})
export class NotFoundPage {}
