import { Page, expect } from '@playwright/test';

// Must match ADMIN_USERNAME / the password behind ADMIN_PASSWORD_HASH in backend/.env.
export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'local-admin-pass';

export async function signIn(page: Page, next = '/manage'): Promise<void> {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Username').fill(ADMIN_USER);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, '\\$&') + '$'));
}
