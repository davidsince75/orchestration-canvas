// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Flow 3: Node selection — click a node, Node Designer panel opens
 * Flow 4: Library drag — Library panel lists all 9 node types
 * Flow 5: Brief panel — textarea accepts input
 */

// Helper: loads the Research Assistant template so there are nodes to interact with
async function loadResearchAssistantTemplate(page) {
  await page.locator('.btn-templates').click();
  await page.waitForSelector('.template-drawer', { state: 'visible' });
  await page.locator('.template-item', { hasText: 'Research Assistant' }).click();
  await expect(page.locator('.template-drawer')).not.toBeVisible();
  await page.waitForSelector('.node-card', { state: 'visible' });
}

test.describe('Node selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
    await loadResearchAssistantTemplate(page);
  });

  test('clicking a node opens the Node Designer right panel', async ({ page }) => {
    // Click the first node card visible on the canvas
    const firstNode = page.locator('.node-card').first();
    await firstNode.click({ force: true });

    // The viewport editor should now show a selected node (not the empty state)
    await expect(page.locator('.vp-empty')).not.toBeVisible();
    await expect(page.locator('.viewport-editor')).toBeVisible();
  });

  test('Node Designer panel shows the clicked node name', async ({ page }) => {
    // Click the orchestrator node by name
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });

    // The right panel header should display the node name
    const vpHeaderName = page.locator('.vp-header-name');
    await expect(vpHeaderName).toBeVisible();
    await expect(vpHeaderName).toHaveText('Research Orchestrator');
  });

  test('Node Designer panel shows the node type', async ({ page }) => {
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });

    const vpHeaderType = page.locator('.vp-header-type');
    await expect(vpHeaderType).toBeVisible();
    await expect(vpHeaderType).toHaveText('orchestrator');
  });

  test('Node Designer panel shows a system prompt textarea for orchestrator nodes', async ({ page }) => {
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });

    // System prompt field should be rendered for orchestrator type
    const systemPromptLabel = page.locator('.field-label', { hasText: 'System Prompt' });
    await expect(systemPromptLabel).toBeVisible();

    const systemPromptField = page.locator('.field-textarea').first();
    await expect(systemPromptField).toBeVisible();
    // Should have content pre-populated from the template
    await expect(systemPromptField).not.toBeEmpty();
  });

  test('Node Designer panel shows the node name field populated correctly', async ({ page }) => {
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });

    const nameInput = page.locator('.field-input').first();
    await expect(nameInput).toHaveValue('Research Orchestrator');
  });

  test('clicking canvas background deselects the node and restores empty state', async ({ page }) => {
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });
    await expect(page.locator('.vp-empty')).not.toBeVisible();

    // Dispatch a mousedown directly on .canvas-inner to simulate a background click.
    // Using dispatchEvent bypasses the Minimap SVG overlay that intercepts pointer events
    // in the bottom-right corner of .canvas-wrapper.
    await page.locator('.canvas-inner').dispatchEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 1800,
      clientY: 1200,
    });

    await expect(page.locator('.vp-empty')).toBeVisible();
  });

  test('screenshot of node selected state', async ({ page }) => {
    const orchNode = page.locator('.node-card', { hasText: 'Research Orchestrator' });
    await orchNode.click({ force: true });
    await page.waitForSelector('.vp-header-name', { state: 'visible' });

    await page.screenshot({ path: 'playwright-report/screenshots/node-selected.png', fullPage: false });
  });
});

test.describe('Library panel node types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });

    // Switch to the Library tab
    await page.locator('.left-tab', { hasText: 'Library' }).click();
    await page.waitForSelector('.library-list', { state: 'visible' });
  });

  test('Library tab shows the library list', async ({ page }) => {
    await expect(page.locator('.library-list')).toBeVisible();
    await expect(page.locator('.library-card').first()).toBeVisible();
  });

  test('lists Orchestrator node type', async ({ page }) => {
    await expect(page.locator('.library-card-label', { hasText: 'Orchestrator' })).toBeVisible();
  });

  test('lists Agent node types (Data Ingester present)', async ({ page }) => {
    // The library has multiple agent entries — verify at least one is visible
    await expect(page.locator('.library-card-type', { hasText: 'agent' }).first()).toBeVisible();
  });

  test('lists Tool node type', async ({ page }) => {
    await expect(page.locator('.library-card-type', { hasText: 'tool' }).first()).toBeVisible();
  });

  test('lists Memory node type', async ({ page }) => {
    await expect(page.locator('.library-card-type', { hasText: 'memory' })).toBeVisible();
  });

  test('lists Router node type', async ({ page }) => {
    await expect(page.locator('.library-card-type', { hasText: 'router' })).toBeVisible();
  });

  test('lists Evaluator node type', async ({ page }) => {
    await expect(page.locator('.library-card-type', { hasText: 'evaluator' })).toBeVisible();
  });

  test('lists Human Review node type', async ({ page }) => {
    await expect(page.locator('.library-card-label', { hasText: 'Human Review' })).toBeVisible();
  });

  test('lists InfraNodus node type', async ({ page }) => {
    await expect(page.locator('.library-card-label', { hasText: 'InfraNodus' })).toBeVisible();
  });

  test('lists Output node type', async ({ page }) => {
    await expect(page.locator('.library-card-label', { hasText: 'Output' })).toBeVisible();
  });

  test('all 9 distinct node type categories are represented', async ({ page }) => {
    const expectedLabels = [
      'Orchestrator',
      'Router',
      'Evaluator',
      'Human Review',
      'InfraNodus',
      'Output',
    ];
    for (const label of expectedLabels) {
      await expect(
        page.locator('.library-card-label', { hasText: label }),
        `Expected to find library card labelled "${label}"`
      ).toBeVisible();
    }

    // Also confirm agent, tool and memory type badges are present
    for (const type of ['agent', 'tool', 'memory']) {
      await expect(
        page.locator('.library-card-type', { hasText: type }).first(),
        `Expected to find library card with type badge "${type}"`
      ).toBeVisible();
    }
  });

  test('search box filters library cards', async ({ page }) => {
    const searchInput = page.locator('.library-search');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('memory');
    // Only memory-related cards should remain
    const visibleCards = page.locator('.library-card');
    await expect(visibleCards).toHaveCount(1);

    // Clear search restores all cards
    await searchInput.fill('');
    const allCards = page.locator('.library-card');
    await expect(allCards).toHaveCount(15);
  });

  test('library cards are draggable (have draggable attribute)', async ({ page }) => {
    const firstCard = page.locator('.library-card').first();
    const draggable = await firstCard.getAttribute('draggable');
    expect(draggable).toBe('true');
  });
});

test.describe('Brief panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
    // Ensure Brief tab is active (it should be by default)
    await page.locator('.left-tab', { hasText: 'Brief' }).click();
  });

  test('Brief textarea is visible and accepts input', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();

    await textarea.fill('Test system brief for E2E verification');
    await expect(textarea).toHaveValue('Test system brief for E2E verification');
  });

  test('brief textarea shows placeholder text when empty', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toContain('Describe the system you want to build');
  });

  test('Generate Map button is disabled when brief is empty', async ({ page }) => {
    const generateBtn = page.locator('.btn-generate');
    await expect(generateBtn).toBeDisabled();
  });

  test('Generate Map button becomes enabled when brief has content', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('A system that processes data');

    const generateBtn = page.locator('.btn-generate');
    await expect(generateBtn).toBeEnabled();
  });

  test('Load Starter Template button is visible and clickable', async ({ page }) => {
    const templateBtn = page.locator('.btn-templates');
    await expect(templateBtn).toBeVisible();
    await expect(templateBtn).toBeEnabled();
  });
});
