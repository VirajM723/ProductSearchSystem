import { Routes } from '@angular/router';
import { adminGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    // The shop page sets its own title based on the search.
    path: '',
    loadComponent: () => import('./pages/shop/shop.page').then((m) => m.ShopPage)
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./pages/product/product.page').then((m) => m.ProductPage)
  },
  {
    path: 'checkout',
    title: 'Checkout · Common Goods',
    loadComponent: () => import('./pages/cart/checkout.page').then((m) => m.CheckoutPage)
  },
  {
    path: 'manage',
    canActivate: [adminGuard],
    title: 'Inventory · Common Goods',
    loadComponent: () => import('./pages/admin/inventory.page').then((m) => m.InventoryPage)
  },
  {
    path: 'manage/new',
    canActivate: [adminGuard],
    title: 'New product · Common Goods',
    loadComponent: () => import('./pages/admin/product-editor.page').then((m) => m.ProductEditorPage)
  },
  {
    path: 'manage/:id',
    canActivate: [adminGuard],
    title: 'Edit product · Common Goods',
    loadComponent: () => import('./pages/admin/product-editor.page').then((m) => m.ProductEditorPage)
  },
  {
    path: 'login',
    title: 'Sign in · Common Goods',
    loadComponent: () => import('./pages/admin/login.page').then((m) => m.LoginPage)
  },
  {
    path: '**',
    title: 'Not found · Common Goods',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage)
  }
];
