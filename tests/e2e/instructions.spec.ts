import { test, expect } from '@playwright/test';

test.describe('Instruction Programming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#btn-rules-close').click();
  });

  test('should allow selecting instructions for player 1', async ({ page }) => {
    // Find first instruction slot for player 1
    const slot = page.locator('#slots-p1 select').first();
    
    // Change to MOVE
    await slot.selectOption('MOVE');
    
    // Verify selection
    await expect(slot).toHaveValue('MOVE');
  });

  test('should allow selecting instructions for player 2', async ({ page }) => {
    const slot = page.locator('#slots-p2 select').first();
    
    await slot.selectOption('REPRODUCE');
    
    await expect(slot).toHaveValue('REPRODUCE');
  });

  test('should have 5 instruction slots per player', async ({ page }) => {
    const p1Slots = page.locator('#slots-p1 select');
    const p2Slots = page.locator('#slots-p2 select');
    
    await expect(p1Slots).toHaveCount(5);
    await expect(p2Slots).toHaveCount(5);
  });

  test('should disable instruction editing when locked', async ({ page }) => {
    // Place a cell first
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    
    const slot = page.locator('#slots-p1 select').first();
    await expect(slot).toBeEnabled();
    
    // Lock player 1
    await page.locator('#btn-lock-p1').click();
    
    // Slot should be disabled
    await expect(slot).toBeDisabled();
  });

  test('should have all instruction types available', async ({ page }) => {
    const slot = page.locator('#slots-p1 select').first();
    
    const options = await slot.locator('option').allTextContents();
    
    expect(options).toContain('MOVE');
    expect(options).toContain('TURN_LEFT');
    expect(options).toContain('TURN_RIGHT');
    expect(options).toContain('REPRODUCE');
    expect(options).toContain('KILL');
    expect(options).toContain('IDLE');
  });
});
