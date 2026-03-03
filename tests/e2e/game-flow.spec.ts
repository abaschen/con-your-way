import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show rules modal on first visit', async ({ page }) => {
    const modal = page.locator('#rules-modal');
    await expect(modal).toBeVisible();
    
    const closeButton = page.locator('#btn-rules-close');
    await closeButton.click();
    
    await expect(modal).not.toBeVisible();
  });

  test('should allow placing cells for both players', async ({ page }) => {
    // Close rules modal
    await page.locator('#btn-rules-close').click();
    
    // Click on left side (Player 1 zone)
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Check counter updated
    const counter1 = page.locator('#counter-p1');
    await expect(counter1).toContainText('Cells: 1 / 20');
    
    // Click on right side (Player 2 zone)
    await canvas.click({ position: { x: 500, y: 100 } });
    
    const counter2 = page.locator('#counter-p2');
    await expect(counter2).toContainText('Cells: 1 / 20');
  });

  test('should show Conway preview when cells are placed', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    const preview = page.locator('#preview-p1');
    await expect(preview).toBeVisible();
  });

  test('should lock players and enable start button', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    // Place cells for both players
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    // Lock player 1
    await page.locator('#btn-lock-p1').click();
    await expect(page.locator('#btn-lock-p1')).toContainText('🔒 Unlock');
    
    // Lock player 2
    await page.locator('#btn-lock-p2').click();
    await expect(page.locator('#btn-lock-p2')).toContainText('🔒 Unlock');
    
    // Start button should be enabled
    const startButton = page.locator('#btn-start');
    await expect(startButton).toBeEnabled();
  });

  test('should start game when both players locked', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    // Place cells
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 500, y: 100 } });
    
    // Lock both players
    await page.locator('#btn-lock-p1').click();
    await page.locator('#btn-lock-p2').click();
    
    // Start game
    await page.locator('#btn-start').click();
    
    // Status should show running
    const status = page.locator('#status-bar');
    await expect(status).toContainText('Battle in progress');
  });

  test('should prevent editing after locking', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    const counter1 = page.locator('#counter-p1');
    await expect(counter1).toContainText('Cells: 1 / 20');
    
    // Lock player 1
    await page.locator('#btn-lock-p1').click();
    
    // Try to place another cell
    await canvas.click({ position: { x: 150, y: 100 } });
    
    // Counter should still be 1
    await expect(counter1).toContainText('Cells: 1 / 20');
    
    // Unlock and try again
    await page.locator('#btn-lock-p1').click();
    await canvas.click({ position: { x: 150, y: 100 } });
    
    // Counter should now be 2
    await expect(counter1).toContainText('Cells: 2 / 20');
  });

  test('should show help button and reopen rules', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    const modal = page.locator('#rules-modal');
    await expect(modal).not.toBeVisible();
    
    // Click help button
    await page.locator('#btn-help').click();
    
    await expect(modal).toBeVisible();
  });

  test('should load example game from rules modal', async ({ page }) => {
    const exampleButton = page.locator('#btn-rules-example');
    await exampleButton.click();
    
    // Should have cells placed
    const counter1 = page.locator('#counter-p1');
    const counter2 = page.locator('#counter-p2');
    
    await expect(counter1).toContainText('Cells:');
    await expect(counter2).toContainText('Cells:');
    
    // Should be unlocked (not auto-locked from URL)
    const lockButton1 = page.locator('#btn-lock-p1');
    const lockButton2 = page.locator('#btn-lock-p2');
    await expect(lockButton1).toContainText('🔓 Lock');
    await expect(lockButton2).toContainText('🔓 Lock');
  });

  test('should toggle lock state', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    const lockButton = page.locator('#btn-lock-p1');
    
    // Initially unlocked
    await expect(lockButton).toContainText('🔓 Lock');
    
    // Lock
    await lockButton.click();
    await expect(lockButton).toContainText('🔒 Unlock');
    
    // Unlock
    await lockButton.click();
    await expect(lockButton).toContainText('🔓 Lock');
    
    // Lock again
    await lockButton.click();
    await expect(lockButton).toContainText('🔒 Unlock');
  });

  test('should reset game', async ({ page }) => {
    await page.locator('#btn-rules-close').click();
    
    // Place cells and lock
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.locator('#btn-lock-p1').click();
    
    // Reset
    await page.locator('#btn-reset').click();
    
    // Should be back in setup
    const counter1 = page.locator('#counter-p1');
    await expect(counter1).toContainText('Cells: 0 / 20');
    
    const lockButton = page.locator('#btn-lock-p1');
    await expect(lockButton).toContainText('🔓 Lock');
  });
});
