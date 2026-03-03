import { test, expect } from '@playwright/test';

test.describe('Replay System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-rules-close').click();
  });

  test('should show replay panel after game ends', async ({ page }) => {
    // Place cells and lock both players
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    await page.locator('#btn-lock-p1').click();
    await page.locator('#btn-lock-p2').click();
    
    // Start game
    await page.locator('#btn-start').click();
    
    // Wait for game to end (cells will die quickly with no stable patterns)
    await page.waitForSelector('#stats-overlay', { state: 'visible', timeout: 10000 });
    
    // Stats screen should be visible
    const statsOverlay = page.locator('#stats-overlay');
    await expect(statsOverlay).toBeVisible();
  });

  test('should show replay controls when clicking View Replay button', async ({ page }) => {
    // Place cells and lock both players
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    await page.locator('#btn-lock-p1').click();
    await page.locator('#btn-lock-p2').click();
    
    // Start game
    await page.locator('#btn-start').click();
    
    // Wait for game to end
    await page.waitForSelector('#stats-overlay', { state: 'visible', timeout: 10000 });
    
    // Click View Replay button
    const replayButton = page.locator('#stats-btn-replay');
    await replayButton.click();
    
    // Stats should be hidden
    const statsOverlay = page.locator('#stats-overlay');
    await expect(statsOverlay).not.toBeVisible();
    
    // Replay panel should be visible
    const replayPanel = page.locator('#replay-panel');
    await expect(replayPanel).toBeVisible();
    
    // Replay controls should be present
    await expect(page.locator('#replay-slider')).toBeVisible();
    await expect(page.locator('#btn-replay-first')).toBeVisible();
    await expect(page.locator('#btn-replay-prev')).toBeVisible();
    await expect(page.locator('#btn-replay-next')).toBeVisible();
    await expect(page.locator('#btn-replay-last')).toBeVisible();
  });

  test('should navigate through replay ticks', async ({ page }) => {
    // Place cells and lock both players
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    await page.locator('#btn-lock-p1').click();
    await page.locator('#btn-lock-p2').click();
    
    // Start game
    await page.locator('#btn-start').click();
    
    // Wait for game to end
    await page.waitForSelector('#stats-overlay', { state: 'visible', timeout: 10000 });
    
    // Click View Replay
    await page.locator('#stats-btn-replay').click();
    
    const replayTickLabel = page.locator('#replay-tick-label');
    
    // Should start at last tick
    const lastTickText = await replayTickLabel.textContent();
    expect(lastTickText).toContain('Tick');
    
    // Click first button
    await page.locator('#btn-replay-first').click();
    await expect(replayTickLabel).toContainText('Tick 0');
    
    // Click next button
    await page.locator('#btn-replay-next').click();
    await expect(replayTickLabel).toContainText('Tick 1');
    
    // Click last button
    await page.locator('#btn-replay-last').click();
    const finalText = await replayTickLabel.textContent();
    expect(finalText).not.toContain('Tick 0');
    expect(finalText).not.toContain('Tick 1');
  });

  test('should exit replay and return to stats', async ({ page }) => {
    // Place cells and lock both players
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    await page.locator('#btn-lock-p1').click();
    await page.locator('#btn-lock-p2').click();
    
    // Start game
    await page.locator('#btn-start').click();
    
    // Wait for game to end
    await page.waitForSelector('#stats-overlay', { state: 'visible', timeout: 10000 });
    
    // Click View Replay
    await page.locator('#stats-btn-replay').click();
    
    // Navigate to a different tick
    await page.locator('#btn-replay-first').click();
    
    // Exit replay button should be visible
    const exitButton = page.locator('#btn-replay-exit');
    await expect(exitButton).toBeVisible();
    
    // Click exit
    await exitButton.click();
    
    // Should return to final state (exit button should hide)
    await expect(exitButton).not.toBeVisible();
  });
});
