import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  tone: 'default' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(text: string, tone: Toast['tone'] = 'default', ms = 3200): void {
    const toast = { id: this.nextId++, text, tone };
    this.toasts.update((list) => [...list.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), ms);
  }

  error(text: string): void {
    this.show(text, 'error', 5000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
