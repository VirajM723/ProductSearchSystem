import { Routes } from '@angular/router';

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
    title: 'Inventory · Common Goods',
    loadComponent: () => import('./pages/admin/inventory.page').then((m) => m.InventoryPage)
  },
  {
    path: 'manage/new',
    title: 'New product · Common Goods',
    loadComponent: () => import('./pages/admin/product-editor.page').then((m) => m.ProductEditorPage)
  },
  {
    path: 'manage/:id',
    title: 'Edit product · Common Goods',
    loadComponent: () => import('./pages/admin/product-editor.page').then((m) => m.ProductEditorPage)
  },
  {
    path: '**',
    title: 'Not found · Common Goods',
    loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage)
  }
];
