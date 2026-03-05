/**
 * Preservation Property Tests
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**
 * 
 * IMPORTANT: These tests verify that functionality NOT related to the bug remains unchanged.
 * 
 * This test suite verifies preservation requirements:
 * 1. Unit tests run successfully with existing Vitest configuration
 * 2. Local development workflow with reuseExistingServer allows running tests against already-running dev server
 * 3. Deploy workflow builds and deploys to GitHub Pages with existing process
 * 4. Test retry configuration (2 retries in CI, 0 locally) remains unchanged
 * 5. HTML reporter with 'open: on-failure' behavior works for local testing
 * 6. pnpm store path caching strategy remains unchanged
 * 7. Chromium browser project configuration remains unchanged
 * 8. Parallel test execution (1 worker in CI, undefined locally) remains unchanged
 * 
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 */

import { test, expect, describe } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

// Helper to parse YAML files
function parseYaml(filePath: string): any {
  const content = readFileSync(filePath, 'utf-8');
  return yaml.parse(content);
}

describe('Preservation Property Tests', () => {
  
  test('Preservation 1: Unit test configuration remains unchanged', () => {
    // Requirement 3.1: Unit tests run successfully with existing Vitest configuration
    const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const workflow = parseYaml(workflowPath);
    
    const unitTestsJob = workflow.jobs['unit-tests'];
    
    // Verify unit-tests job exists and runs pnpm test:unit
    expect(unitTestsJob).toBeDefined();
    
    const runTestsStep = unitTestsJob.steps.find(
      (step: any) => step.name === 'Run unit tests'
    );
    
    expect(runTestsStep).toBeDefined();
    expect(runTestsStep?.run).toBe('pnpm test:unit');
    
    // Verify package.json has test:unit script
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    expect(packageJson.scripts['test:unit']).toBe('vitest run');
  });
  
  test('Preservation 2: Local development workflow with reuseExistingServer', () => {
    // Requirement 3.2: Local development workflow allows running tests against already-running dev server
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Verify reuseExistingServer is configured to allow local dev server reuse
    expect(configContent).toContain('reuseExistingServer: !process.env.CI');
  });
  
  test('Preservation 3: Deploy workflow builds and deploys to GitHub Pages', () => {
    // Requirement 3.3: Deploy workflow builds and deploys to GitHub Pages with existing process
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    // Verify build job exists
    expect(deployWorkflow.jobs.build).toBeDefined();
    
    // Verify build step exists
    const buildStep = deployWorkflow.jobs.build.steps.find(
      (step: any) => step.name === 'Build application'
    );
    expect(buildStep).toBeDefined();
    expect(buildStep?.run).toBe('pnpm build');
    
    // Verify deploy job exists
    expect(deployWorkflow.jobs.deploy).toBeDefined();
    
    // Verify deploy step exists
    const deployStep = deployWorkflow.jobs.deploy.steps.find(
      (step: any) => step.name === 'Deploy to GitHub Pages'
    );
    expect(deployStep).toBeDefined();
    expect(deployStep?.uses).toBe('actions/deploy-pages@v4');
    
    // Verify GitHub Pages permissions
    expect(deployWorkflow.permissions).toBeDefined();
    expect(deployWorkflow.permissions.pages).toBe('write');
    expect(deployWorkflow.permissions['id-token']).toBe('write');
  });
  
  test('Preservation 4: Test retry configuration remains unchanged', () => {
    // Requirement 3.4: Test retry configuration (2 retries in CI, 0 locally) remains unchanged
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Verify retry configuration
    expect(configContent).toContain('retries: process.env.CI ? 2 : 0');
  });
  
  test('Preservation 5: HTML reporter configuration remains unchanged', () => {
    // Requirement 3.5: HTML reporter with 'open: on-failure' behavior works for local testing
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Verify HTML reporter is configured
    // Note: The current config has reporter: 'html', which is the default
    // After the fix, it will be conditional, but HTML should still be available locally
    expect(configContent).toMatch(/reporter.*html/i);
  });
  
  test('Preservation 6: pnpm store path caching strategy remains unchanged', () => {
    // Requirement 3.6: pnpm store path caching strategy remains unchanged
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    // Check unit-tests job
    const unitTestsSteps = testWorkflow.jobs['unit-tests'].steps;
    const unitTestsPnpmCacheStep = unitTestsSteps.find(
      (step: any) => step.name === 'Setup pnpm cache'
    );
    
    expect(unitTestsPnpmCacheStep).toBeDefined();
    expect(unitTestsPnpmCacheStep?.uses).toBe('actions/cache@v4');
    expect(unitTestsPnpmCacheStep?.with?.path).toBe('${{ env.STORE_PATH }}');
    
    // Check e2e-tests job
    const e2eTestsSteps = testWorkflow.jobs['e2e-tests'].steps;
    const e2eTestsPnpmCacheStep = e2eTestsSteps.find(
      (step: any) => step.name === 'Setup pnpm cache'
    );
    
    expect(e2eTestsPnpmCacheStep).toBeDefined();
    expect(e2eTestsPnpmCacheStep?.uses).toBe('actions/cache@v4');
    expect(e2eTestsPnpmCacheStep?.with?.path).toBe('${{ env.STORE_PATH }}');
    
    // Check deploy workflow build job
    const buildSteps = deployWorkflow.jobs.build.steps;
    const buildPnpmCacheStep = buildSteps.find(
      (step: any) => step.name === 'Setup pnpm cache'
    );
    
    expect(buildPnpmCacheStep).toBeDefined();
    expect(buildPnpmCacheStep?.uses).toBe('actions/cache@v4');
    expect(buildPnpmCacheStep?.with?.path).toBe('${{ env.STORE_PATH }}');
  });
  
  test('Preservation 7: Chromium browser project configuration remains unchanged', () => {
    // Requirement 3.7: Chromium browser project configuration remains unchanged
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Verify chromium project is configured
    expect(configContent).toContain("name: 'chromium'");
    expect(configContent).toContain("devices['Desktop Chrome']");
    
    // Verify only chromium is installed in CI
    const workflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const workflow = parseYaml(workflowPath);
    
    const installBrowsersStep = workflow.jobs['e2e-tests'].steps.find(
      (step: any) => step.name === 'Install Playwright browsers'
    );
    
    expect(installBrowsersStep).toBeDefined();
    expect(installBrowsersStep?.run).toContain('chromium');
  });
  
  test('Preservation 8: Parallel test execution configuration remains unchanged', () => {
    // Requirement 3.8: Parallel test execution (1 worker in CI, undefined locally) remains unchanged
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    // Verify worker configuration
    expect(configContent).toContain('workers: process.env.CI ? 1 : undefined');
  });
  
  test('Preservation 9: Base URL configuration remains unchanged', () => {
    // Additional preservation check: Base URL should remain localhost:5173
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain("baseURL: 'http://localhost:5173'");
    expect(configContent).toContain("url: 'http://localhost:5173'");
  });
  
  test('Preservation 10: Trace configuration remains unchanged', () => {
    // Additional preservation check: Trace should be on-first-retry
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain("trace: 'on-first-retry'");
  });
  
  test('Preservation 11: Test directory configuration remains unchanged', () => {
    // Additional preservation check: Test directory should be ./tests/e2e
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain("testDir: './tests/e2e'");
  });
  
  test('Preservation 12: fullyParallel configuration remains unchanged', () => {
    // Additional preservation check: fullyParallel should be true
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain('fullyParallel: true');
  });
  
  test('Preservation 13: forbidOnly configuration remains unchanged', () => {
    // Additional preservation check: forbidOnly should be !!process.env.CI
    const configPath = join(process.cwd(), 'playwright.config.ts');
    const configContent = readFileSync(configPath, 'utf-8');
    
    expect(configContent).toContain('forbidOnly: !!process.env.CI');
  });
  
  test('Preservation 14: Node version in unit-tests and deploy jobs remains 24', () => {
    // Additional preservation check: Node 24 should be used in unit-tests and deploy jobs
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const unitTestsNodeVersion = testWorkflow.jobs['unit-tests'].steps.find(
      (step: any) => step.name === 'Setup Node.js'
    )?.with?.['node-version'];
    
    expect(unitTestsNodeVersion).toBe('24');
    
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    const buildNodeVersion = deployWorkflow.jobs.build.steps.find(
      (step: any) => step.name === 'Setup Node.js'
    )?.with?.['node-version'];
    
    expect(buildNodeVersion).toBe('24');
  });
  
  test('Preservation 15: pnpm setup action remains consistent', () => {
    // Additional preservation check: pnpm/action-setup@v4 should be used consistently
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    // Check all jobs use pnpm/action-setup@v4
    const unitTestsPnpmSetup = testWorkflow.jobs['unit-tests'].steps.find(
      (step: any) => step.name === 'Setup pnpm'
    );
    expect(unitTestsPnpmSetup?.uses).toBe('pnpm/action-setup@v4');
    
    const e2eTestsPnpmSetup = testWorkflow.jobs['e2e-tests'].steps.find(
      (step: any) => step.name === 'Setup pnpm'
    );
    expect(e2eTestsPnpmSetup?.uses).toBe('pnpm/action-setup@v4');
    
    const buildPnpmSetup = deployWorkflow.jobs.build.steps.find(
      (step: any) => step.name === 'Setup pnpm'
    );
    expect(buildPnpmSetup?.uses).toBe('pnpm/action-setup@v4');
  });
  
  test('Preservation 16: Frozen lockfile installation remains unchanged', () => {
    // Additional preservation check: pnpm install --frozen-lockfile should be used
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    // Check all jobs use --frozen-lockfile
    const unitTestsInstall = testWorkflow.jobs['unit-tests'].steps.find(
      (step: any) => step.name === 'Install dependencies'
    );
    expect(unitTestsInstall?.run).toBe('pnpm install --frozen-lockfile');
    
    const e2eTestsInstall = testWorkflow.jobs['e2e-tests'].steps.find(
      (step: any) => step.name === 'Install dependencies'
    );
    expect(e2eTestsInstall?.run).toBe('pnpm install --frozen-lockfile');
    
    const buildInstall = deployWorkflow.jobs.build.steps.find(
      (step: any) => step.name === 'Install dependencies'
    );
    expect(buildInstall?.run).toBe('pnpm install --frozen-lockfile');
  });
  
  test('Preservation 17: Workflow triggers remain unchanged', () => {
    // Additional preservation check: Workflow triggers should remain the same
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    expect(testWorkflow.on.push.branches).toEqual(['main', 'develop']);
    expect(testWorkflow.on.pull_request.branches).toEqual(['main']);
    
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    expect(deployWorkflow.on.push.branches).toEqual(['main']);
    expect(deployWorkflow.on.workflow_dispatch).toBeDefined();
  });
  
  test('Preservation 18: Deploy workflow concurrency configuration remains unchanged', () => {
    // Additional preservation check: Deploy workflow concurrency should remain the same
    const deployWorkflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
    const deployWorkflow = parseYaml(deployWorkflowPath);
    
    expect(deployWorkflow.concurrency).toBeDefined();
    expect(deployWorkflow.concurrency.group).toBe('pages');
    expect(deployWorkflow.concurrency['cancel-in-progress']).toBe(false);
  });
  
  test('Preservation 19: Upload artifact action version remains consistent', () => {
    // Additional preservation check: actions/upload-artifact@v4 should be used
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const uploadArtifactStep = testWorkflow.jobs['e2e-tests'].steps.find(
      (step: any) => step.uses?.includes('actions/upload-artifact')
    );
    
    expect(uploadArtifactStep?.uses).toBe('actions/upload-artifact@v4');
  });
  
  test('Preservation 20: Artifact upload always runs on test completion', () => {
    // Additional preservation check: Artifact upload should run on always() or !cancelled()
    const testWorkflowPath = join(process.cwd(), '.github/workflows/test.yml');
    const testWorkflow = parseYaml(testWorkflowPath);
    
    const uploadArtifactStep = testWorkflow.jobs['e2e-tests'].steps.find(
      (step: any) => step.uses?.includes('actions/upload-artifact')
    );
    
    // Should have a condition that ensures upload happens even on failure
    expect(uploadArtifactStep?.if).toBeDefined();
    expect(uploadArtifactStep?.if).toMatch(/always|cancelled/);
  });
});
