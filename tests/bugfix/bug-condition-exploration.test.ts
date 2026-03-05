/**
 * Bug Condition Exploration Test
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9**
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bugs exist
 * 
 * This test verifies that the bug conditions exist in the current implementation:
 * 1. Playwright webServer uses 'pnpm dev' which hangs indefinitely
 * 2. e2e-tests job uses Node 20 while other jobs use Node 24 (inconsistency)
 * 3. Playwright browsers are not cached (installed from scratch every run)
 * 4. e2e-tests job has no timeout configuration
 * 5. github reporter is not configured (missing PR annotations)
 * 6. Artifact retention is 30 days instead of 7-14 days
 * 
 * EXPECTED OUTCOME: Test FAILS (this proves the bugs exist)
 */

import { test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

// Helper to parse YAML files
function parseYaml(filePath: string): any {
  const content = readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

test('Bug Condition 1: Playwright webServer uses long-running dev command', () => {
  // Read playwright.config.ts
  const configPath = join(process.cwd(), 'playwright.config.ts');
  const configContent = readFileSync(configPath, 'utf-8');
  
  // Expected behavior: webServer should use 'pnpm build && pnpm preview' for clean exit
  // Bug condition: webServer uses 'pnpm dev' which never exits
  expect(configContent).toContain("command: 'pnpm build && pnpm preview'");
  expect(configContent).not.toContain("command: 'pnpm dev'");
});

test('Bug Condition 2: Node version inconsistency between jobs', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const unitTestsNodeVersion = workflow.jobs['unit-tests'].steps.find(
    (step: any) => step.name === 'Setup Node.js'
  )?.with?.['node-version'];
  
  const e2eTestsNodeVersion = workflow.jobs['e2e-tests'].steps.find(
    (step: any) => step.name === 'Setup Node.js'
  )?.with?.['node-version'];
  
  // Expected behavior: Both jobs should use Node 24
  // Bug condition: e2e-tests uses Node 20, unit-tests uses Node 24
  expect(e2eTestsNodeVersion).toBe('24');
  expect(unitTestsNodeVersion).toBe('24');
  expect(e2eTestsNodeVersion).toBe(unitTestsNodeVersion);
});

test('Bug Condition 3: Playwright browsers not cached', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const e2eSteps = workflow.jobs['e2e-tests'].steps;
  
  // Expected behavior: Should have a cache step for ~/.cache/ms-playwright
  // Bug condition: No cache step exists
  const playwrightCacheStep = e2eSteps.find(
    (step: any) => step.uses?.includes('actions/cache') && 
                   step.with?.path?.includes('.cache/ms-playwright')
  );
  
  expect(playwrightCacheStep).toBeDefined();
  expect(playwrightCacheStep?.with?.path).toContain('.cache/ms-playwright');
});

test('Bug Condition 4: e2e-tests job has no timeout configuration', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const e2eJob = workflow.jobs['e2e-tests'];
  
  // Expected behavior: Should have timeout-minutes: 30
  // Bug condition: No timeout configuration
  expect(e2eJob['timeout-minutes']).toBeDefined();
  expect(e2eJob['timeout-minutes']).toBe(30);
});

test('Bug Condition 5: github reporter not configured', () => {
  const configPath = join(process.cwd(), 'playwright.config.ts');
  const configContent = readFileSync(configPath, 'utf-8');
  
  // Expected behavior: Should have github reporter in CI
  // Bug condition: Only 'html' reporter configured
  expect(configContent).toMatch(/reporter:.*github/);
});

test('Bug Condition 6: Artifact retention is 30 days instead of 7-14 days', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const uploadArtifactStep = workflow.jobs['e2e-tests'].steps.find(
    (step: any) => step.uses?.includes('actions/upload-artifact')
  );
  
  // Expected behavior: retention-days should be 14 or less
  // Bug condition: retention-days is 30
  expect(uploadArtifactStep?.with?.['retention-days']).toBeLessThanOrEqual(14);
});

test('Bug Condition 7: Artifact upload missing !cancelled() condition', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const uploadArtifactStep = workflow.jobs['e2e-tests'].steps.find(
    (step: any) => step.uses?.includes('actions/upload-artifact')
  );
  
  // Expected behavior: Should have if: ${{ !cancelled() }}
  // Bug condition: Only has if: always()
  expect(uploadArtifactStep?.if).toContain('!cancelled()');
});

test('Bug Condition 8: Browser installation not split into install + deps', () => {
  const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
  const workflow = parseYaml(workflowPath);
  
  const e2eSteps = workflow.jobs['e2e-tests'].steps;
  
  // Expected behavior: Should have separate steps for browser install and deps
  // Bug condition: Single step with --with-deps flag
  const installBrowsersStep = e2eSteps.find(
    (step: any) => step.name === 'Install Playwright browsers'
  );
  
  const installDepsStep = e2eSteps.find(
    (step: any) => step.name === 'Install Playwright browser dependencies'
  );
  
  expect(installBrowsersStep).toBeDefined();
  expect(installDepsStep).toBeDefined();
  expect(installBrowsersStep?.run).toContain('playwright install chromium');
  expect(installBrowsersStep?.run).not.toContain('--with-deps');
  expect(installDepsStep?.run).toContain('playwright install-deps');
});

test('Bug Condition 9: webServer missing reuseExistingServer: false for CI', () => {
  const configPath = join(process.cwd(), 'playwright.config.ts');
  const configContent = readFileSync(configPath, 'utf-8');
  
  // Expected behavior: Should have reuseExistingServer: !process.env.CI
  // This is actually correct in the current config, but we're checking it's preserved
  expect(configContent).toContain('reuseExistingServer: !process.env.CI');
});
