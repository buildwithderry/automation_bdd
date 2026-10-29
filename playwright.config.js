// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');
const { env } = require('./config/env');

/**
 * Konfigurasi BDD template.
 *
 * KATA KUNCI GHERKIN BAHASA INGGRIS, TEKS LANGKAH BAHASA INDONESIA.
 *
 * Feature/Background/Rule/Scenario/Given/When/Then — dialek bawaan Gherkin.
 * Kalimat langkahnya dalam Bahasa Indonesia agar bisa dibaca PO/BA.
 *
 * `bddgen` menerjemahkannya menjadi spec Playwright biasa di `.features-gen/`,
 * lalu Playwright runner yang menjalankannya — sehingga worker, fixture,
 * trace, dan reporter Allure tetap bekerja persis seperti biasa.
 */
const bddSaucedemo = defineBddConfig({
  features: 'features/saucedemo/**/*.feature',
  steps: ['fixtures/saucedemo.bdd.fixture.js', 'steps/saucedemo/**/*.js'],
  featuresRoot: 'features',
  outputDir: '.features-gen/saucedemo',
});

const sedangMendaftar = process.argv.includes('--list');

const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1536, height: 864 } };
const mobile  = { ...devices['Pixel 7'] };

const commonUse = {
  headless: env.headless,
  actionTimeout: env.timeout.action,
  navigationTimeout: env.timeout.navigation,
  screenshot: 'only-on-failure',
  video: process.env.VIDEO_ON_FAIL === '0' ? 'off' : 'retain-on-failure',
  trace: 'retain-on-failure',
  locale: 'id-ID',
  timezoneId: 'Asia/Jakarta',
  launchOptions: { slowMo: env.slowMo },
};

module.exports = defineConfig({
  /**
   * `fullyParallel: true` aman karena SauceDemo stateless per user.
   * Fixture mengambil user berdasarkan workerIndex % pool.length.
   */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /**
   * Default 4 worker. Override: WORKERS=1 npm run test:desktop
   * Untuk cloud CI disarankan WORKERS=2.
   */
  workers: Number(process.env.WORKERS) || 4,
  timeout: env.timeout.test,
  expect: { timeout: env.timeout.expect },
  globalSetup: require.resolve('./config/global_setup.js'),
  globalTeardown: require.resolve('./config/global_teardown.js'),
  outputDir: 'artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }],
    ['./reporters/custom.reporter.js'],
    ['junit', { outputFile: 'artifacts/junit.xml', embedAnnotationsAsProperties: true }],
    ...(sedangMendaftar ? [] : [['allure-playwright', {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: false,
      environmentInfo: {
        ENV: env.name,
        BASE_URL: env.baseUrl.app,
        NODE_VERSION: process.version,
      },
    }]]),
  ],
  projects: [
    {
      name: 'saucedemo-desktop',
      testDir: bddSaucedemo,
      use: { ...commonUse, ...desktop, baseURL: env.baseUrl.app },
      metadata: { app: 'saucedemo', device: 'desktop' },
    },
    {
      name: 'saucedemo-mobile',
      testDir: bddSaucedemo,
      use: { ...commonUse, ...mobile, baseURL: env.baseUrl.app },
      metadata: { app: 'saucedemo', device: 'mobile' },
    },
    /**
     * BrowserStack projects — aktifkan dengan mengisi BROWSERSTACK_USERNAME
     * dan BROWSERSTACK_ACCESS_KEY di .env.dev, lalu jalankan npm run test:bs
     *
     * Uncomment blok di bawah untuk mengaktifkan:
     */
    // {
    //   name: 'browserstack-chrome',
    //   testDir: bddSaucedemo,
    //   use: {
    //     ...commonUse,
    //     ...desktop,
    //     baseURL: env.baseUrl.app,
    //     connectOptions: {
    //       wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${
    //         encodeURIComponent(JSON.stringify({
    //           browser: 'chrome',
    //           browser_version: 'latest',
    //           os: 'Windows',
    //           os_version: '11',
    //           'browserstack.username': process.env.BROWSERSTACK_USERNAME,
    //           'browserstack.accessKey': process.env.BROWSERSTACK_ACCESS_KEY,
    //           'browserstack.local': false,
    //           name: 'SauceDemo E2E',
    //           build: process.env.BROWSERSTACK_BUILD_NAME || 'local-build',
    //           project: process.env.BROWSERSTACK_PROJECT_NAME || 'automation-bdd-template',
    //         }))
    //       }`,
    //     },
    //   },
    //   metadata: { app: 'saucedemo', device: 'browserstack-chrome' },
    // },
  ],
});
