import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: '**/*.e2e.mjs', fullyParallel: true,
  timeout: 30000, expect: { timeout: 5000 }, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'android-small', use: { browserName: 'chromium', viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true } },
    { name: 'iphone', use: { browserName: 'webkit', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    cwd: '../..', url: 'http://127.0.0.1:4173', reuseExistingServer: false,
    env: { VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_AUTH_DOMAIN: '', VITE_FIREBASE_DATABASE_URL: '', VITE_FIREBASE_PROJECT_ID: '', VITE_FIREBASE_APP_ID: '' }
  }
});
