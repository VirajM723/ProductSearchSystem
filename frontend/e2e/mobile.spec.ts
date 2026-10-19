import { expect, test } from '@playwright/test';

test('filters open in a drawer on small screens', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.getByRole('complementary', { name: 'Filters' });
  await expect(sidebar).not.toBeInViewport();

  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(sidebar).toBeInViewport();
  await sidebar.getByRole('checkbox', { name: /^Books\b/ }).check();
  await expect(page).toHaveURL(/category=Books/);
  await sidebar.getByRole('button', { name: 'Done' }).click();
  await expect(sidebar).not.toBeInViewport();
  await expect(page.locator('app-product-card')).toHaveCount(2);
});

test('no horizontal scrolling on the main pages', async ({ page }) => {
  for (const url of ['/', '/?q=lamp', '/manage', '/manage/new', '/checkout']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, url).toBeLessThanOrEqual(0);
  }
});
