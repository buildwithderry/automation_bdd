const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../../fixtures/saucedemo.bdd.fixture');

Given('pengguna membuka halaman login', async ({ loginPage }) => {
  await loginPage.goto();
});

When('pengguna masuk sebagai {string} dengan password {string}', async ({ loginPage }, username, password) => {
  await loginPage.login(username, password);
});

When('pengguna menekan tombol Login tanpa mengisi username', async ({ loginPage }) => {
  await loginPage.login('', '');
});

When('pengguna membuka menu hamburger', async ({ productsPage }) => {
  await productsPage.menuButton.click();
});

When('pengguna mengklik {string}', async ({ page }, label) => {
  await page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label })).click();
});

Then('pengguna diarahkan ke halaman produk', async ({ productsPage }) => {
  await productsPage.isOnProductsPage();
});

Then('judul halaman menampilkan {string}', async ({ page }, text) => {
  await expect(page.locator('[data-test="title"]')).toHaveText(text);
});

Then('tombol keranjang terlihat di header', async ({ page }) => {
  await expect(page.locator('[data-test="shopping-cart-link"]')).toBeVisible();
});

Then('pengguna kembali ke halaman login', async ({ loginPage }) => {
  await expect(loginPage.loginButton).toBeVisible();
});

Then('pesan error ditampilkan berisi {string}', async ({ loginPage }, text) => {
  const err = await loginPage.errorText();
  expect(err).toContain(text);
});

Then('pengguna tetap di halaman login', async ({ loginPage }) => {
  await expect(loginPage.loginButton).toBeVisible();
});
