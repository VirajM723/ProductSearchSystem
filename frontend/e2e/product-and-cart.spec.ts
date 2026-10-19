import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('product page shows details, related items and links back', async ({ page }) => {
  await page.goto('/?q=chelsea%20boots');
  await page.locator('app-product-card .name').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leather Chelsea Boots');
  await expect(page.getByText('In stock, ships in 2 to 3 days')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More in Footwear' })).toBeVisible();
  await expect(page.locator('.related app-product-card')).not.toHaveCount(0);
  await expect(page).toHaveTitle(/Leather Chelsea Boots/);

  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Footwear' }).click();
  await expect(page).toHaveURL(/category=Footwear/);
});

test('sold out products cannot be added', async ({ page }) => {
  await page.goto('/?q=chef%27s%20knife');
  await page.locator('app-product-card .name').first().click();
  await expect(page.getByText('Sold out for now')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unavailable' })).toBeDisabled();
});

test('bad and missing product ids show a friendly message', async ({ page }) => {
  await page.goto('/product/not-a-real-id');
  await expect(page.getByRole('heading', { name: 'This product is gone' })).toBeVisible();
  await page.goto('/product/507f1f77bcf86cd799439011');
  await expect(page.getByRole('heading', { name: 'This product is gone' })).toBeVisible();
});

test('add to bag, change quantity, remove, and it survives a reload', async ({ page }) => {
  await page.goto('/?q=dot%20grid%20notebook');
  await page.locator('app-product-card .name').first().click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: 'Increase quantity' }).click();
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByText(/Added Dot Grid Notebook A5/)).toBeVisible();
  await expect(page.locator('.bag .badge')).toHaveText('3');

  await page.reload();
  await expect(page.locator('.bag .badge')).toHaveText('3');

  await page.locator('.bag').click();
  const drawer = page.getByRole('dialog', { name: 'Your bag' });
  await expect(drawer).toBeVisible();
  // 3 x 690 = 2070, under the free delivery threshold
  await expect(drawer.getByText('Add ₹430 more for free delivery.')).toBeVisible();
  await drawer.getByRole('button', { name: 'Increase Dot Grid Notebook A5' }).click();
  await expect(drawer.getByText('Free', { exact: true })).toBeVisible();

  await drawer.getByRole('button', { name: 'Remove' }).click();
  await expect(drawer.getByText('Your bag is empty.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.locator('.bag .badge')).toHaveCount(0);
});

test('quantity is capped at 10', async ({ page }) => {
  await page.goto('/?q=yoga%20mat');
  await page.locator('app-product-card .name').first().click();
  const plus = page.getByRole('button', { name: 'Increase quantity' });
  for (let i = 0; i < 12; i++) if (await plus.isEnabled()) await plus.click();
  await expect(page.locator('.qty span')).toHaveText('10');
  await expect(plus).toBeDisabled();
});

test('checkout validates the form and places an order', async ({ page }) => {
  await page.goto('/');
  await page.locator('app-product-card').filter({ hasText: 'Halden' }).getByRole('button', { name: /Add/ }).click();
  await page.locator('.bag').click();
  await page.getByRole('button', { name: /Checkout/ }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByText('Please enter your name')).toBeVisible();
  await expect(page.getByLabel('Full name')).toBeFocused();

  await page.getByLabel('Full name').fill('Asha Rao');
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Phone', { exact: true }).fill('12345');
  await page.getByLabel('Address').fill('14 Lake View Road');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('PIN code').fill('0110');
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(page.getByText('Enter a 10 digit mobile number')).toBeVisible();
  await expect(page.getByText('PIN codes are 6 digits')).toBeVisible();

  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('Phone', { exact: true }).fill('9876543210');
  await page.getByLabel('PIN code').fill('411001');
  await page.getByRole('button', { name: /Place order/ }).click();
  await expect(page.getByRole('heading', { name: 'Thanks, Asha.' })).toBeVisible();
  await expect(page.locator('.bag .badge')).toHaveCount(0);
});

test('checkout with an empty bag', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Your bag is empty' })).toBeVisible();
});
