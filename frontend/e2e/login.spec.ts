import { expect, test } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USER, signIn } from './admin';

test('inventory pages send visitors to sign in', async ({ page }) => {
  for (const url of ['/manage', '/manage/new']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  }
});

test('visitors do not see the Manage link', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Manage' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Staff sign in' })).toBeVisible();
});

test('wrong password shows an error and clears the field', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(ADMIN_USER);
  await page.getByLabel('Password', { exact: true }).fill('definitely-wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong username or password');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});

test('empty form asks for both fields', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter your username and password.');
});

test('show and hide password', async ({ page }) => {
  await page.goto('/login');
  const field = page.getByLabel('Password', { exact: true });
  await field.fill('abc');
  await expect(field).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(field).toHaveAttribute('type', 'text');
});

test('sign in returns to the page you wanted, then sign out', async ({ page }) => {
  await page.goto('/manage/new');
  await page.getByLabel('Username').fill(ADMIN_USER);
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/manage\/new$/);
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Manage' })).toBeVisible();

  // The session survives a reload (it's a cookie, not page state).
  await page.reload();
  await expect(page.getByRole('heading', { name: 'New product' })).toBeVisible();

  await page.goto('/manage');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/manage');
  await expect(page).toHaveURL(/\/login/);
});

test('next= cannot send you to another site', async ({ page }) => {
  await signIn(page, '/manage');
  await page.goto('/login?next=//evil.example.com');
  await expect(page).toHaveURL(/\/manage$/);
});

test('session cookie is not readable from page scripts', async ({ page }) => {
  await signIn(page);
  const cookies = await page.evaluate(() => document.cookie);
  expect(cookies).not.toContain('cg_session');
});

test('an expired session sends you back to sign in', async ({ page, context }) => {
  await signIn(page);
  await context.clearCookies();
  await page.locator('tbody tr').first().getByRole('button', { name: 'Delete' }).click();
  await page.locator('tbody tr').first().getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fmanage/);
  await expect(page.getByText('Your session ended. Please sign in again.')).toBeVisible();
});
