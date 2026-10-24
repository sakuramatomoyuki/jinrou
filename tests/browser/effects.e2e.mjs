import { test, expect } from '@playwright/test';

async function boot(page, { memory = 8, cores = 8, saveData = false, saved = null, reduced = false } = {}) {
  // Only the local application is allowed. Never call production Firebase.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ memory, cores, saveData, saved }) => {
    Object.defineProperty(navigator, 'deviceMemory', { configurable: true, value: memory });
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: cores });
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData } });
    // Do not overwrite saved settings on reload.
    if (!sessionStorage.getItem('effects-test-seeded')) {
      localStorage.clear();
      if (saved !== null) localStorage.setItem('jinrou-effects', saved);
      localStorage.setItem('jinrou-bgm', 'off');
      localStorage.setItem('jinrou-sound', 'off');
      sessionStorage.setItem('effects-test-seeded', 'yes');
    }
  }, { memory, cores, saveData, saved });
  await page.goto('/');
  await expect(page.locator('.effects-toggle')).toBeVisible();
}
async function mode(page, light) {
  await expect(page.locator('.effects-toggle')).toHaveAttribute('aria-pressed', String(light));
  await expect(page.locator('html')).toHaveClass(light ? /performance-light/ : /^(?!.*performance-light).*$/);
  await expect(page.locator('.app')).toHaveClass(light ? /performance-light/ : /^(?!.*performance-light).*$/);
}
async function fits(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const buttons = page.locator('.app > header button');
  const boxes = [];
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth) + 1);
    boxes.push(box);
  }
  for (let i = 1; i < boxes.length; i++) {
    const a = boxes[i - 1], b = boxes[i];
    expect(a.x + a.width <= b.x + 1 || a.y + a.height <= b.y + 1).toBe(true);
  }
}
for (const [name, options, expected] of [
  ['normal', {}, false], ['4GB boundary', { memory: 4 }, true],
  ['4 cores boundary', { cores: 4 }, true], ['Save-Data', { saveData: true }, true],
  ['reduced motion', { reduced: true }, true],
  ['unknown hardware', { memory: null, cores: null }, false],
  ['saved full overrides hardware', { memory: 2, saved: 'full' }, false],
  ['saved light', { saved: 'light' }, true],
  ['invalid setting uses detection', { saved: 'invalid', cores: 2 }, true]
]) {
  test('initial mode: ' + name, async ({ page }) => {
    await boot(page, options); await mode(page, expected);
  });
}
for (const saved of ['full', 'light']) {
  test('mobile navigation, input, persistence: ' + saved, async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await boot(page, { saved });
    await mode(page, saved === 'light');
    await fits(page);
    await page.getByRole('button', { name: /ルームを作成/ }).click();
    const input = page.getByPlaceholder('例：月見');
    await input.fill('スマホ確認');
    await expect(input).toHaveValue('スマホ確認');
    await fits(page);
    const started = Date.now();
    await page.locator('.effects-toggle').click();
    await mode(page, saved !== 'light');
    await expect(input).toHaveValue('スマホ確認');
    // A coarse stuck-UI regression guard; this is not a real-device latency measurement.
    const elapsedMs = Date.now() - started;
    expect(elapsedMs).toBeLessThan(5000);
    await info.attach('toggle-latency.json', { body: JSON.stringify({ elapsedMs, scope: 'automation wall clock, not INP' }), contentType: 'application/json' });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('jinrou-effects'))).toBe(saved === 'light' ? 'full' : 'light');
    await page.reload();
    await mode(page, saved !== 'light');
    await page.locator('.effects-toggle').click();
    await mode(page, saved === 'light');
    await page.reload();
    await mode(page, saved === 'light');
    await page.getByRole('button', { name: /役職一覧/ }).click();
    await fits(page);
    await info.attach('roles.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    expect(errors).toEqual([]);
  });
}
test('CSS effects apply outside app and restore on toggle', async ({ page }) => {
  await boot(page, { saved: 'full' });
  // Isolated CSS probes: these do not exercise real game phase progression.
  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.id = 'effects-probe';
    probe.innerHTML = '<div class="personal-notes-scrim"></div><div class="death-cloud"></div><div class="action-cinematic-backdrop"></div>';
    probe.style.cssText = 'position:fixed;left:-10000px;pointer-events:none';
    document.body.append(probe);
  });
  const backdrop = page.locator('#effects-probe .personal-notes-scrim');
  const original = await backdrop.evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter);
  expect(original).toContain('blur');
  await page.locator('.effects-toggle').click();
  await mode(page, true);
  expect(await backdrop.evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter)).toBe('none');
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(await page.locator('#effects-probe .death-cloud').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  expect(await page.locator('#effects-probe .action-cinematic-backdrop').evaluate(el => getComputedStyle(el, '::before').display)).toBe('none');
  await page.locator('.effects-toggle').click();
  await mode(page, false);
  expect(await backdrop.evaluate(el => getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter)).toBe(original);
});
