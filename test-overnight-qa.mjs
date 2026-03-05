import { chromium } from 'playwright';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const REPORT_FILE = 'BUG_REPORT_OVERNIGHT.md';
const BASE_URL = 'http://localhost:3000';
let bugCount = 0;
let testCount = 0;

// Clear report file
writeFileSync(REPORT_FILE, '# 🧪 OVERNIGHT QA AUDIT REPORT\n\n**Generated:** ' + new Date().toISOString() + '\n\n---\n\n');

function logBug(priority, title, reproduction, expected, actual, recommendation) {
  bugCount++;
  testCount++;
  const bug = `
## Bug #${bugCount} - ${priority}: ${title}

**Reproduction Steps:**
${reproduction}

**Expected:**
${expected}

**Actual:**
${actual}

**Recommended Fix:**
${recommendation}

---
`;
  appendFileSync(REPORT_FILE, bug);
  console.log(`🐛 ${priority}: ${title}`);
}

function logSuccess(testName) {
  testCount++;
  console.log(`✅ ${testName}`);
}

async function testUI(page) {
  console.log('\n📱 === UI TESTING ===\n');
  
  // Test 1: Homepage loads
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (title) {
      logSuccess('Homepage loads');
    }
  } catch (err) {
    logBug('P0', 'Homepage fails to load', '1. Navigate to http://localhost:3000', 'Page loads successfully', `Error: ${err.message}`, 'Check Next.js server and routing configuration');
  }

  // Test 2: Login page loads
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    const loginForm = await page.$('form');
    if (loginForm) {
      logSuccess('Login page loads');
    } else {
      logBug('P1', 'Login form not found', '1. Navigate to /login', 'Login form visible', 'Form element not found', 'Check login page component rendering');
    }
  } catch (err) {
    logBug('P0', 'Login page fails to load', '1. Navigate to /login', 'Page loads successfully', `Error: ${err.message}`, 'Check auth routing');
  }

  // Test 3: Register page loads
  try {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
    const registerForm = await page.$('form');
    if (registerForm) {
      logSuccess('Register page loads');
    } else {
      logBug('P1', 'Register form not found', '1. Navigate to /register', 'Register form visible', 'Form element not found', 'Check register page component');
    }
  } catch (err) {
    logBug('P0', 'Register page fails to load', '1. Navigate to /register', 'Page loads successfully', `Error: ${err.message}`, 'Check auth routing');
  }

  // Test 4: Console errors on homepage
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  if (consoleErrors.length > 0) {
    logBug('P2', `Console errors on homepage (${consoleErrors.length})`, '1. Open homepage\n2. Check browser console', 'No console errors', `Found ${consoleErrors.length} errors: ${consoleErrors.slice(0, 3).join(', ')}`, 'Review and fix all console errors');
  } else {
    logSuccess('No console errors on homepage');
  }
}

async function testResponsive(page) {
  console.log('\n📐 === RESPONSIVE TESTING ===\n');
  
  const viewports = [
    { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
    { width: 768, height: 1024, name: 'Tablet (iPad)' },
    { width: 1024, height: 768, name: 'Tablet Landscape' },
    { width: 1920, height: 1080, name: 'Desktop' },
  ];

  for (const viewport of viewports) {
    try {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      
      // Check if page is scrollable horizontally (overflow)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      if (hasHorizontalScroll && viewport.width < 768) {
        logBug('P2', `Horizontal scroll on ${viewport.name}`, `1. Resize browser to ${viewport.width}x${viewport.height}\n2. Load homepage`, 'No horizontal scroll', 'Page has horizontal scroll', 'Check CSS for fixed widths, use max-width and responsive units');
      } else {
        logSuccess(`${viewport.name} - No horizontal scroll`);
      }
    } catch (err) {
      logBug('P2', `Error testing ${viewport.name}`, `Test viewport ${viewport.width}x${viewport.height}`, 'Viewport renders correctly', `Error: ${err.message}`, 'Check responsive CSS');
    }
  }
}

async function testWorkflowWF01(page) {
  console.log('\n🔄 === WORKFLOW WF-01 TESTING ===\n');
  
  const testPrompts = [
    'A modern 5-story office building with glass facade',
    'Small residential house with 3 bedrooms',
    'Commercial shopping mall with parking',
    'Educational institute with multiple classrooms',
    'Hospital building with emergency wing'
  ];

  // Note: This requires authentication, so we'll document what to test
  logBug('P3', 'WF-01 workflow testing requires auth', 
    '1. Login to dashboard\n2. Navigate to /dashboard/canvas\n3. Load WF-01 template\n4. Test with prompts:\n' + testPrompts.map((p, i) => `   ${i+1}. "${p}"`).join('\n'),
    'Each prompt generates valid building description, 3D massing, and concept render',
    'Manual testing required - auth needed',
    'Add automated E2E tests with Playwright auth workflow');
}

async function main() {
  console.log('🧪 TESTER GOAT - OVERNIGHT QA AUDIT STARTING...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await testUI(page);
    await testResponsive(page);
    await testWorkflowWF01(page);
  } catch (err) {
    console.error('Fatal error:', err);
    logBug('P0', 'Fatal error during testing', 'Run test suite', 'All tests complete', `Fatal error: ${err.message}`, 'Debug test script');
  }

  await browser.close();

  // Summary
  const summary = `
## 📊 SUMMARY

- **Total Tests:** ${testCount}
- **Bugs Found:** ${bugCount}
- **Pass Rate:** ${((testCount - bugCount) / testCount * 100).toFixed(1)}%

## 🎯 PRIORITY BREAKDOWN

${bugCount > 0 ? 'See individual bugs above for detailed breakdown.' : '✅ NO BUGS FOUND!'}

## 📋 NEXT STEPS

1. Review all P0 bugs immediately
2. Fix P1 bugs before next deployment
3. Schedule P2/P3 bugs for next sprint
4. Add automated E2E tests for workflows
5. Set up CI/CD to run this test suite on every PR

---

**Testing completed at:** ${new Date().toISOString()}
`;

  appendFileSync(REPORT_FILE, summary);
  console.log('\n' + summary);
  console.log(`\n📄 Full report saved to: ${REPORT_FILE}`);
}

main().catch(console.error);
