// @ts-check
import { test, expect } from '@playwright/test';

/**
 * Flow 4: AI-powered features
 * Verifies the UI surface of every AI-assisted feature introduced in v0.3.0:
 * Build tab, Draft/Improve, Infer schemas, example prompts, Suggest input.
 * Does NOT make real API calls — all tests operate on UI state only.
 */

test.describe('Empty canvas onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
  });

  test('canvas shows example prompt buttons when empty', async ({ page }) => {
    const examples = page.locator('.placeholder-example-btn');
    await expect(examples).toHaveCount(5);
    // All five should be visible
    for (let i = 0; i < 5; i++) {
      await expect(examples.nth(i)).toBeVisible();
    }
  });

  test('canvas placeholder shows guidance text', async ({ page }) => {
    await expect(page.locator('.placeholder-title')).toBeVisible();
    await expect(page.locator('.placeholder-sub')).toContainText('Architect');
  });

  test('Architect panel auto-opens to Build tab on empty canvas', async ({ page }) => {
    const architectPanel = page.locator('.architect-panel');
    await expect(architectPanel).toBeVisible();
    const buildTab = page.locator('.arch-tab.active');
    await expect(buildTab).toContainText('Build');
  });

  test('clicking example prompt fills Architect Build textarea', async ({ page }) => {
    const firstExample = page.locator('.placeholder-example-btn').first();
    const exampleText  = await firstExample.textContent();

    await firstExample.click();

    const textarea = page.locator('.arch-build-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue(exampleText || '');
  });

  test('Architect panel opens when example is clicked if it was closed', async ({ page }) => {
    // Close the architect panel first
    await page.locator('.arch-close').click();
    await expect(page.locator('.architect-panel')).not.toBeVisible();

    // Click example — panel should re-open
    await page.locator('.placeholder-example-btn').first().click();
    await expect(page.locator('.architect-panel')).toBeVisible();
  });
});

test.describe('Architect Build tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.architect-panel', { state: 'visible' });
  });

  test('Build tab is the first tab and active by default', async ({ page }) => {
    const tabs = page.locator('.arch-tab');
    await expect(tabs.first()).toContainText('Build');
    await expect(tabs.first()).toHaveClass(/active/);
  });

  test('Build tab shows textarea and disabled Build Pipeline button when empty', async ({ page }) => {
    const textarea  = page.locator('.arch-build-textarea');
    const buildBtn  = page.locator('.arch-run-btn', { hasText: 'Build Pipeline' });
    await expect(textarea).toBeVisible();
    await expect(buildBtn).toBeVisible();
    await expect(buildBtn).toBeDisabled();
  });

  test('Build Pipeline button enables once textarea has text', async ({ page }) => {
    await page.locator('.arch-build-textarea').fill('A research pipeline for market analysis');
    const buildBtn = page.locator('.arch-run-btn', { hasText: 'Build Pipeline' });
    await expect(buildBtn).toBeEnabled();
  });

  test('Build tab shows hint text when empty', async ({ page }) => {
    const hint = page.locator('.arch-build-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('plain English');
  });

  test('switching away and back to Build tab preserves textarea content', async ({ page }) => {
    await page.locator('.arch-build-textarea').fill('Test pipeline description');
    await page.locator('.arch-tab', { hasText: 'Diagnose' }).click();
    await page.locator('.arch-tab', { hasText: 'Build' }).click();
    await expect(page.locator('.arch-build-textarea')).toHaveValue('Test pipeline description');
  });
});

test.describe('AI Draft / Improve system prompt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      // Load a graph with one agent node so the inspector renders
      const graph = {
        nodes: [{
          id: 'n1', type: 'agent', name: 'Research Agent',
          role: 'Searches the web for relevant information',
          systemPrompt: '', inputSchema: {}, outputSchema: {},
          position: { x: 200, y: 200 },
        }],
        edges: [],
      };
      localStorage.setItem('oc_graph', JSON.stringify(graph));
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
    // Select the node to open inspector
    await page.locator('.node-card').first().click();
    await page.waitForSelector('.vp-header', { state: 'visible' });
  });

  test('Draft button appears on agent node with empty system prompt', async ({ page }) => {
    const draftBtn = page.locator('.draft-btn', { hasText: 'Draft' });
    await expect(draftBtn).toBeVisible();
  });

  test('Draft button is disabled when no API key is set', async ({ page }) => {
    const draftBtn = page.locator('.draft-btn', { hasText: 'Draft' });
    await expect(draftBtn).toBeDisabled();
  });

  test('Draft button becomes Improve when system prompt is populated', async ({ page }) => {
    // Type into system prompt field
    await page.locator('.field-textarea').first().fill('You are a helpful research assistant.');
    const improveBtn = page.locator('.draft-btn', { hasText: 'Improve' });
    await expect(improveBtn).toBeVisible();
  });

  test('Infer schemas button appears for agent node', async ({ page }) => {
    const inferBtn = page.locator('.draft-btn', { hasText: 'Infer' });
    await expect(inferBtn).toBeVisible();
  });

  test('Infer button is disabled when no API key is set', async ({ page }) => {
    const inferBtn = page.locator('.draft-btn', { hasText: 'Infer' });
    await expect(inferBtn).toBeDisabled();
  });
});

test.describe('AI Draft not shown for non-agent node types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const graph = {
        nodes: [{
          id: 'n1', type: 'tool', name: 'Web Search',
          role: 'Searches the web', systemPrompt: '',
          inputSchema: {}, outputSchema: {},
          position: { x: 200, y: 200 },
        }],
        edges: [],
      };
      localStorage.setItem('oc_graph', JSON.stringify(graph));
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
    await page.locator('.node-card').first().click();
    await page.waitForSelector('.vp-header', { state: 'visible' });
  });

  test('Draft button does not appear for tool nodes', async ({ page }) => {
    // Tool nodes don't have systemPrompt field or draft button
    const draftBtn = page.locator('.draft-btn', { hasText: 'Draft' });
    await expect(draftBtn).not.toBeVisible();
  });
});

test.describe('Run mode — Suggest input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const graph = {
        nodes: [
          { id: 'n1', type: 'orchestrator', name: 'Orchestrator',
            role: 'Coordinates the pipeline', systemPrompt: 'You are a coordinator.',
            inputSchema: {}, outputSchema: {}, position: { x: 300, y: 100 } },
          { id: 'n2', type: 'agent', name: 'Analyst',
            role: 'Analyses the data', systemPrompt: 'You analyse financial data.',
            inputSchema: {}, outputSchema: {}, position: { x: 300, y: 300 } },
        ],
        edges: [{ id: 'e1', from: 'n1', to: 'n2', label: 'delegates' }],
      };
      localStorage.setItem('oc_graph', JSON.stringify(graph));
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
    // Switch to Run mode
    await page.locator('.toggle-btn', { hasText: 'Run' }).click();
    await page.waitForSelector('.run-brief-panel', { state: 'visible' });
  });

  test('Suggest input button is visible when Pipeline Input is empty', async ({ page }) => {
    const suggestBtn = page.locator('.draft-btn', { hasText: 'Suggest input' });
    await expect(suggestBtn).toBeVisible();
  });

  test('Suggest input button is disabled when no API key is set', async ({ page }) => {
    const suggestBtn = page.locator('.draft-btn', { hasText: 'Suggest input' });
    await expect(suggestBtn).toBeDisabled();
  });

  test('Suggest input button disappears once Pipeline Input has text', async ({ page }) => {
    const textarea = page.locator('.run-brief-panel textarea');
    await textarea.fill('Analyse the Q3 performance of Apple Inc.');
    const suggestBtn = page.locator('.draft-btn', { hasText: 'Suggest input' });
    await expect(suggestBtn).not.toBeVisible();
  });

  test('Pipeline Input is editable when idle', async ({ page }) => {
    const textarea = page.locator('.run-brief-panel textarea');
    await textarea.fill('Test input for the pipeline');
    await expect(textarea).toHaveValue('Test input for the pipeline');
  });
});

test.describe('Left panel — Run Context (no Generate Map)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('oc_graph');
      localStorage.removeItem('oc_brief');
    });
    await page.reload();
    await page.waitForSelector('.topbar', { state: 'visible' });
  });

  test('left panel Context tab shows Run Context heading', async ({ page }) => {
    const heading = page.locator('.panel-heading', { hasText: 'Run Context' });
    await expect(heading).toBeVisible();
  });

  test('Generate Map button is no longer present', async ({ page }) => {
    const generateBtn = page.locator('button', { hasText: 'Generate Map' });
    await expect(generateBtn).not.toBeVisible();
  });

  test('Load Starter Template button is still present', async ({ page }) => {
    const templateBtn = page.locator('.btn-templates');
    await expect(templateBtn).toBeVisible();
  });

  test('Context hint text is visible', async ({ page }) => {
    const hint = page.locator('.brief-context-hint');
    await expect(hint).toBeVisible();
  });
});
