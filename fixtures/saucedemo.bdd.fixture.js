const { test: base, expect } = require('playwright-bdd');
const { createBdd } = require('playwright-bdd');
const path = require('path');
const { env } = require('../config/env');
const { LoginPage }    = require('../pages/saucedemo/LoginPage');
const { ProductsPage } = require('../pages/saucedemo/ProductsPage');
const { CartPage }     = require('../pages/saucedemo/CartPage');
const { CheckoutPage } = require('../pages/saucedemo/CheckoutPage');

const POOL = require('./data/users.json').pool;

/**
 * Fixture utama SauceDemo.
 *
 * USER POOL per worker:
 *   Setiap worker mendapat user berdasarkan `workerIndex % pool.length`.
 *   SauceDemo stateless — tidak ada shared state antar user login,
 *   sehingga `fullyParallel: true` aman dipakai.
 *
 * PAGE OBJECTS:
 *   Disediakan langsung dari fixture supaya step definitions tidak
 *   perlu `require` manual dan dependency jelas.
 */
const test = base.extend({
  /** User aktif untuk worker ini, diambil dari pool berdasarkan workerIndex. */
  currentUser: async ({}, use, workerInfo) => {
    const user = POOL[workerInfo.workerIndex % POOL.length];
    await use(user);
  },

  /** Page objects — tersedia otomatis di semua step. */
  loginPage:    async ({ page }, use) => use(new LoginPage(page)),
  productsPage: async ({ page }, use) => use(new ProductsPage(page)),
  cartPage:     async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),

  /** Simpan data test ke fixtures/output/<bucket>/ + lampirkan ke Allure. */
  simpan: async ({}, use, testInfo) => {
    const { saveRecord } = require('../core/store');
    const fn = async (bucket, name, data) => {
      const { file, slug, record } = saveRecord(bucket, name, data);
      await testInfo.attach(`${bucket}-${slug}.json`, {
        path: file,
        contentType: 'application/json',
      });
      return { file, slug, record };
    };
    await use(fn);
  },

  env: async ({}, use) => use(env),
});

const { Given, When, Then } = createBdd(test);

module.exports = { test, expect, Given, When, Then, env };
