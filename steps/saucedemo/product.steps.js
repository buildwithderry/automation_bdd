const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../../fixtures/saucedemo.bdd.fixture');

Given('pengguna sudah login sebagai standard_user', async ({ loginPage, productsPage }) => {
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await productsPage.isOnProductsPage();
});

Given('pengguna berada di halaman produk', async ({ productsPage }) => {
  await productsPage.isOnProductsPage();
});

When('pengguna memilih filter {string}', async ({ productsPage }, option) => {
  await productsPage.selectSort(option);
});

When('pengguna mengklik produk pertama', async ({ productsPage }) => {
  await productsPage.clickFirstProduct();
});

Then('halaman menampilkan {int} produk', async ({ productsPage }, count) => {
  expect(await productsPage.itemCount()).toBe(count);
});

Then('setiap produk memiliki nama, harga, dan tombol Add to cart', async ({ page }) => {
  const names   = await page.locator('[data-test="inventory-item-name"]').count();
  const prices  = await page.locator('[data-test="inventory-item-price"]').count();
  const buttons = await page.locator('[data-test^="add-to-cart"]').count();
  expect(names).toBe(6);
  expect(prices).toBe(6);
  expect(buttons).toBe(6);
});

Then('produk pertama adalah yang berharga paling murah', async ({ productsPage }) => {
  const products = await productsPage.allProducts();
  const sorted   = [...products].sort((a, b) => a.price - b.price);
  expect(products[0].name).toBe(sorted[0].name);
});

Then('produk pertama adalah yang berharga paling mahal', async ({ productsPage }) => {
  const products = await productsPage.allProducts();
  const sorted   = [...products].sort((a, b) => b.price - a.price);
  expect(products[0].name).toBe(sorted[0].name);
});

Then('produk pertama secara alfabet adalah yang paling awal', async ({ productsPage }) => {
  const products = await productsPage.allProducts();
  const sorted   = [...products].sort((a, b) => a.name.localeCompare(b.name));
  expect(products[0].name).toBe(sorted[0].name);
});

Then('halaman detail menampilkan nama produk', async ({ page }) => {
  await expect(page.locator('[data-test="inventory-item-name"]')).toBeVisible();
});

Then('halaman detail menampilkan harga produk', async ({ page }) => {
  await expect(page.locator('[data-test="inventory-item-price"]')).toBeVisible();
});

Then('halaman detail menampilkan deskripsi produk', async ({ page }) => {
  await expect(page.locator('[data-test="inventory-item-desc"]')).toBeVisible();
});

Then('tombol {string} tersedia', async ({ page }, label) => {
  await expect(page.getByRole('button', { name: label })).toBeVisible();
});
