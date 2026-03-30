// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Flow 2: Template loading
 * Flow 6: New templates present
 *
 * Covers: opening the template drawer, verifying all expected templates
 * (including the three new ones), loading "Research Assistant", and
 * confirming that the canvas is populated after loading.
 */

test.describe('Template drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
  });

  test('opens when clicking "Load Starter Template" button', async ({ page }) => {
    const templateBtn = page.locator('.btn-templates');
    await expect(templateBtn).toBeVisible();
    await templateBtn.click();

    const drawer = page.locator('.template-drawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('.template-drawer-title')).toHaveText('Starter Templates');
  });

  test('lists Research Assistant template', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    const researchItem = page.locator('.template-item-name', { hasText: 'Research Assistant' });
    await expect(researchItem).toBeVisible();
  });

  test('lists the three new leadership templates', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    await expect(page.locator('.template-item-name', { hasText: 'Implementation Leadership' })).toBeVisible();
    await expect(page.locator('.template-item-name', { hasText: 'Stakeholder Alignment' })).toBeVisible();
    await expect(page.locator('.template-item-name', { hasText: 'Strategic Judgment' })).toBeVisible();
  });

  test('closes when the × button is clicked', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    await page.locator('.template-close-btn').click();
    await expect(page.locator('.template-drawer')).not.toBeVisible();
  });

  test('closes when clicking the overlay backdrop', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    // The overlay is full-screen; the drawer slides in from the right.
    // Click in the left portion of the screen (outside the drawer panel).
    const overlay = page.locator('.template-overlay');
    const drawer  = page.locator('.template-drawer');
    const drawerBox = await drawer.boundingBox();

    // Click to the left of the drawer, safely outside it
    const clickX = Math.max(10, (drawerBox?.x ?? 600) / 2);
    const clickY = Math.floor(page.viewportSize()?.height ?? 400) / 2;
    await overlay.click({ position: { x: clickX, y: clickY } });

    await expect(drawer).not.toBeVisible();
  });

  test('loads Research Assistant and populates the canvas with nodes', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    // Click "Research Assistant" — triggers window.confirm for canvas replace (canvas is empty, so it should auto-accept)
    // The canvas is empty at this point, so no confirm dialog is raised
    await page.locator('.template-item', { hasText: 'Research Assistant' }).click();

    // Drawer should close automatically after selection
    await expect(page.locator('.template-drawer')).not.toBeVisible();

    // Nodes should appear on the canvas
    const nodeCards = page.locator('.node-card');
    await expect(nodeCards).toHaveCount(6); // Research Assistant template has 6 nodes

    // The orchestrator node should be visible by name
    await expect(page.locator('.node-name', { hasText: 'Research Orchestrator' })).toBeVisible();
  });

  test('brief textarea is populated after loading a template', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });

    await page.locator('.template-item', { hasText: 'Research Assistant' }).click();
    await expect(page.locator('.template-drawer')).not.toBeVisible();

    const briefTextarea = page.locator('textarea').first();
    await expect(briefTextarea).not.toBeEmpty();
  });

  test('screenshot after loading Research Assistant template', async ({ page }) => {
    await page.locator('.btn-templates').click();
    await page.waitForSelector('.template-drawer', { state: 'visible' });
    await page.locator('.template-item', { hasText: 'Research Assistant' }).click();
    await page.waitForSelector('.node-card', { state: 'visible' });

    await page.screenshot({ path: 'playwright-report/screenshots/research-assistant-loaded.png', fullPage: false });
  });
});
