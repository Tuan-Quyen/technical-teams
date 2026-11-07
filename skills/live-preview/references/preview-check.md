# Preview spec template (Playwright)

Adapt to the project's language, folder and config; follow an existing `playwright.config.*` if there is one (its `baseURL`, `webServer`, projects). If the config has a `webServer` block, Playwright starts and stops the app itself — prefer that over a manual background server.

```ts
// e2e/preview/w-012.spec.ts  — live preview for W-012 (keep it: it is the regression test)
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:5173';
const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

// Collect every signal the user would suffer from but a unit test never sees.
function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`http ${r.status()}: ${r.request().method()} ${r.url()}`);
  });
  return problems;
}

test.describe('W-012 live preview', () => {
  for (const vp of VIEWPORTS) {
    test(`AC1 create a project — ${vp.name}`, async ({ page }) => {
      await page.setViewportSize(vp);
      const problems = watch(page);

      await page.goto(`${BASE}/projects`);
      await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
      await page.getByRole('button', { name: 'New project' }).click();
      await page.getByLabel('Name').fill('Dự án thử nghiệm với tên rất dài để kiểm tra xuống dòng');
      await page.getByRole('button', { name: 'Create' }).click();
      await expect(page.getByText('Project created')).toBeVisible();
      await expect(page.getByRole('row', { name: /Dự án thử nghiệm/ })).toBeVisible(); // no reload needed (D-06)

      // no horizontal scroll (L-01)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow, 'horizontal scroll').toBe(false);

      await page.screenshot({ path: `test-results/w-012-projects-${vp.width}.png`, fullPage: true });
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  test('empty state (D-01)', async ({ page }) => {
    await page.route('**/api/projects*', (r) => r.fulfill({ json: { items: [], total: 0 } }));
    await page.goto(`${BASE}/projects`);
    await expect(page.getByText(/no projects yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'New project' })).toBeVisible(); // a way forward
    await page.screenshot({ path: 'test-results/w-012-projects-empty.png', fullPage: true });
  });

  test('error state (D-04, D-05)', async ({ page }) => {
    await page.route('**/api/projects*', (r) => r.fulfill({ status: 500, json: { error: 'boom' } }));
    await page.goto(`${BASE}/projects`);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry|thử lại/i })).toBeVisible();
    await expect(page.getByText(/boom|stack|undefined/i)).toHaveCount(0); // no raw error to the user
  });

  test('keyboard + deep link + back (A-01, N-01, N-02)', async ({ page }) => {
    await page.goto(`${BASE}/projects/new`);           // deep link
    await page.reload();                                // reload on the route
    await expect(page.getByLabel('Name')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible(); // focus is visible somewhere
    await page.goBack();
  });

  test('double submit (S-01)', async ({ page }) => {
    let posts = 0;
    page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/api/projects')) posts++; });
    await page.goto(`${BASE}/projects/new`);
    await page.getByLabel('Name').fill('Once');
    await page.getByRole('button', { name: 'Create' }).dblclick();
    await expect(page.getByText('Project created')).toBeVisible();
    expect(posts).toBe(1);
  });
});
```

| Adapting | |
|---|---|
| Cypress project | same checks: `cy.on('uncaught:exception')`, `cy.intercept` for empty/error states, `cy.viewport` |
| No JS (Django/Rails templates) | Playwright still works against the server; Python projects can use `pytest-playwright` with the same structure |
| Mobile app (React Native / Flutter) | not a browser: use the project's device runner (Detox, Maestro, `flutter drive`) with the same states and screenshots; web build when it exists |
| Auth | log in once in a `setup` project with a **seeded test user**, save `storageState`; never real credentials |
| Slow API | `page.route(..., async r => { await new Promise(s => setTimeout(s, 1500)); await r.continue(); })` to screenshot the loading state — a delay to *create* a state is fine, a `waitForTimeout` to *hide* a race is not |
