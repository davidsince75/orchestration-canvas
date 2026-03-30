// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Flow 1: App loads
 * Verifies that the three main layout regions — top bar, left panel, and right
 * panel — are all visible on initial load, regardless of saved state.
 */

test.describe('App loads', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any persisted canvas state so every test starts clean
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    // Wait for React to finish mounting
    await page.waitForSelector('.topbar', { state: 'visible' });
  });

  test('top bar is visible with app title', async ({ page }) => {
    const title = page.locator('.topbar-title');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Orchestration Canvas');
  });

  test('Design and Run mode buttons are present in top bar', async ({ page }) => {
    const designBtn = page.locator('.toggle-btn', { hasText: 'Design' });
    const runBtn    = page.locator('.toggle-btn', { hasText: 'Run' });
    await expect(designBtn).toBeVisible();
    await expect(runBtn).toBeVisible();
    // Default state: Design should be active
    await expect(designBtn).toHaveClass(/active/);
  });

  test('left panel is visible with Brief and Library tabs', async ({ page }) => {
    const leftPanel = page.locator('.left-panel');
    await expect(leftPanel).toBeVisible();

    const briefTab   = page.locator('.left-tab', { hasText: 'Brief' });
    const libraryTab = page.locator('.left-tab', { hasText: 'Library' });
    await expect(briefTab).toBeVisible();
    await expect(libraryTab).toBeVisible();
  });

  test('canvas area is visible', async ({ page }) => {
    const canvasArea = page.locator('.canvas-area');
    await expect(canvasArea).toBeVisible();
  });

  test('right panel (viewport editor) shows empty-state message', async ({ page }) => {
    // When nothing is selected, the right panel shows an empty-state prompt
    const vpEmpty = page.locator('.vp-empty');
    await expect(vpEmpty).toBeVisible();
    await expect(vpEmpty).toContainText('Click any node to inspect');
  });

  test('Architect and Preferences buttons are in the top bar', async ({ page }) => {
    const architectBtn = page.locator('button', { hasText: 'Architect' });
    const prefsBtn     = page.locator('button[title="Preferences"]');
    await expect(architectBtn).toBeVisible();
    await expect(prefsBtn).toBeVisible();
  });

  test('screenshot of initial app state', async ({ page }) => {
    await page.screenshot({ path: 'playwright-report/screenshots/app-initial-state.png', fullPage: false });
  });
});
