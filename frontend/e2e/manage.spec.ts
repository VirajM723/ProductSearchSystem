import { expect, test } from '@playwright/test';
import { signIn } from './admin';

const unique = `Test Shelf ${Date.now().toString(36)}`;

test.describe.serial('managing products', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('inventory lists products and shows search status', async ({ page }) => {
    await page.goto('/manage');
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByText('Search index online')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(15);

    await page.getByLabel('Filter products').fill('lamp');
    await expect(page.locator('tbody tr')).toHaveCount(2);

    await page.getByLabel('Filter products').fill('');
    await page.getByLabel('Stock filter').selectOption('out');
    await expect(page.locator('tbody .pill.out')).not.toHaveCount(0);
    await expect(page.locator('tbody .pill:not(.out)')).toHaveCount(0);
  });

  test('form shows validation errors', async ({ page }) => {
    await page.goto('/manage/new');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText('This field is required')).toHaveCount(5);

    await page.getByLabel('Name', { exact: true }).fill('   ');
    await page.getByLabel('Price (₹)').fill('-4');
    await page.getByLabel(/Rating/).fill('8');
    await page.getByLabel(/Image URL/).fill('ftp://nope');
    await page.getByRole('button', { name: 'Create product' }).click();
    await expect(page.getByText('Must be 0 or more')).toBeVisible();
    await expect(page.getByText('Rating must be between 0 and 5')).toBeVisible();
    await expect(page.getByText('Use a full link starting with http:// or https://')).toBeVisible();
  });

  test('create a product, then find it in the shop', async ({ page }) => {
    await page.goto('/manage/new');
    await page.getByLabel('Name', { exact: true }).fill(unique);
    await page.getByLabel('Description').fill('Solid oak wall shelf with hidden brackets.');
    await page.getByLabel('Category').fill('Home');
    await page.getByLabel('Brand').fill('Testwood');
    await page.getByLabel('Price (₹)').fill('4599');
    await page.getByLabel(/Tags/).fill('oak, shelf, Oak');
    await expect(page.locator('.preview')).toContainText(unique);
    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page).toHaveURL(/\/manage$/);
    await expect(page.getByText(`${unique} created`)).toBeVisible();

    await page.goto(`/?q=${encodeURIComponent(unique)}`);
    await expect(page.locator('app-product-card').first()).toContainText(unique);
    await expect(page.locator('app-product-card').first()).toContainText('₹4,599');
  });

  test('edit the product', async ({ page }) => {
    await page.goto('/manage');
    await page.getByLabel('Filter products').fill(unique);
    await page.getByRole('row', { name: new RegExp(unique) }).getByRole('link', { name: 'Edit' }).click();
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue(unique);
    await expect(page.getByLabel(/Tags/)).toHaveValue('oak, shelf');

    await page.getByLabel('Price (₹)').fill('3999');
    await page.getByLabel('In stock').uncheck();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Changes saved')).toBeVisible();

    await page.goto(`/?q=${encodeURIComponent(unique)}`);
    const card = page.locator('app-product-card').first();
    await expect(card).toContainText('₹3,999');
    await expect(card).toContainText('Sold out');
  });

  test('delete needs a second click, then removes it', async ({ page }) => {
    await page.goto('/manage');
    await page.getByLabel('Filter products').fill(unique);
    const row = page.getByRole('row', { name: new RegExp(unique) });
    await row.getByRole('button', { name: 'Delete' }).click();
    await row.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(`Deleted ${unique}`)).toBeVisible();
    await expect(page.getByText('No products match that filter.')).toBeVisible();

    await page.goto(`/?q=${encodeURIComponent(unique)}`);
    await expect(page.getByRole('heading', { name: /Nothing matched/ })).toBeVisible();
  });

  test('editing a product that does not exist', async ({ page }) => {
    await page.goto('/manage/507f1f77bcf86cd799439011');
    await expect(page.getByText('That product no longer exists.')).toBeVisible();
  });

  test('rebuild index button', async ({ page }) => {
    await page.goto('/manage');
    await page.getByRole('button', { name: 'Rebuild index' }).click();
    await expect(page.getByText(/Search index rebuilt with \d+ products/)).toBeVisible();
  });
});
