import { expect, test } from '@playwright/test';

const cards = (page: import('@playwright/test').Page) => page.locator('app-product-card');

test.describe('shop', () => {
  test('home page lists products with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Everyday things');
    await expect(cards(page)).toHaveCount(12);
    await expect(page.locator('p.count')).toHaveText(/1–12 of \d+/);
    expect(errors).toEqual([]);
  });

  test('search from the header updates the URL and results', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('combobox', { name: 'Search products' });
    await box.fill('headphones');
    await box.press('Enter');
    await expect(page).toHaveURL(/\?q=headphones/);
    await expect(cards(page).first()).toContainText('Halden Over-Ear Headphones');
    await expect(page).toHaveTitle(/headphones/);
  });

  test('typos still find the product', async ({ page }) => {
    await page.goto('/?q=cofee%20grindr');
    await expect(cards(page).first()).toContainText('Burr Coffee Grinder');
  });

  test('autocomplete suggests products and opens them', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('combobox', { name: 'Search products' });
    await box.pressSequentially('kett', { delay: 40 });
    const options = page.getByRole('option');
    await expect(options.first()).toContainText('Search for');
    await expect(page.getByRole('option', { name: /Pour-Over Coffee Kettle/ })).toBeVisible();

    await box.press('ArrowDown');
    await box.press('ArrowDown');
    await box.press('Enter');
    await expect(page).toHaveURL(/\/product\//);
  });

  test('autocomplete closes with Escape', async ({ page }) => {
    await page.goto('/');
    const box = page.getByRole('combobox', { name: 'Search products' });
    await box.pressSequentially('lamp', { delay: 40 });
    await expect(page.getByRole('listbox')).toBeVisible();
    await box.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('no results shows a suggestion and a way out', async ({ page }) => {
    await page.goto('/?q=blnkt');
    await expect(page.getByRole('heading', { name: /Nothing matched/ })).toBeVisible();
    await page.getByRole('link', { name: 'blanket' }).click();
    await expect(cards(page).first()).toContainText('Wool Throw Blanket');
  });

  test('category and brand filters combine and show as chips', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('checkbox', { name: /^Kitchen\b/ }).check();
    await expect(page).toHaveURL(/category=Kitchen/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kitchen');

    const count = await cards(page).count();
    expect(count).toBeGreaterThan(0);
    for (const label of await page.locator('app-product-art .label').allTextContents()) {
      expect(label.trim().toLowerCase()).toBe('kitchen');
    }

    await page.getByRole('checkbox', { name: /^Hearth\b/ }).check();
    await expect(page).toHaveURL(/brand=Hearth/);
    await expect(page.locator('.chip')).toHaveCount(2);
    await expect(cards(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Remove filter Hearth' }).click();
    await expect(page.locator('.chip')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.locator('.chip')).toHaveCount(0);
  });

  test('price range filter', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Minimum price').fill('1000');
    await page.getByLabel('Maximum price').fill('2000');
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page).toHaveURL(/min=1000&max=2000/);
    await expect(page.locator('.chip')).toContainText('₹1,000 – ₹2,000');

    const prices = await page.locator('app-product-card .price').allTextContents();
    expect(prices.length).toBeGreaterThan(0);
    for (const p of prices) {
      const n = Number(p.replace(/[^\d.]/g, ''));
      expect(n).toBeGreaterThanOrEqual(1000);
      expect(n).toBeLessThanOrEqual(2000);
    }
  });

  test('in stock filter hides sold out items', async ({ page }) => {
    await page.goto('/?category=Audio');
    await expect(page.getByText('Sold out')).toHaveCount(1);
    await page.getByLabel('In stock only').check();
    await expect(page).toHaveURL(/stock=1/);
    await expect(page.locator('.flag')).toHaveCount(0);
  });

  test('sorting by price', async ({ page }) => {
    await page.goto('/');
    await page.locator('.sort select').selectOption('price_asc');
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(cards(page).first()).toContainText('₹690');
    const prices = (await page.locator('app-product-card .price').allTextContents()).map((p) => Number(p.replace(/[^\d.]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('pagination and the back button', async ({ page }) => {
    await page.goto('/');
    const firstName = await cards(page).first().locator('.name').textContent();
    await page.getByRole('navigation', { name: 'Pages' }).getByRole('button', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('p.count')).toHaveText(/13–24 of/);
    await expect(cards(page).first().locator('.name')).not.toHaveText(firstName!);

    await page.goBack();
    await expect(page.locator('p.count')).toHaveText(/1–12 of/);
  });

  test('junk in the URL does not break the page', async ({ page }) => {
    await page.goto('/?page=-3&sort=nope&min=abc&max=-1&stock=maybe');
    await expect(cards(page)).toHaveCount(12);
    await page.goto('/?q=%22%28%2A');
    await expect(page.locator('main')).toBeVisible();
  });

  test('unknown routes show a 404 page', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.getByRole('heading', { name: "We can't find that page." })).toBeVisible();
  });
});
