const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../../fixtures/saucedemo.bdd.fixture');

When('pengguna menambahkan produk pertama ke keranjang', async ({ productsPage }) => {
  await productsPage.addToCartByIndex(0);
});

When('pengguna menambahkan {int} produk ke keranjang', async ({ productsPage }, count) => {
  for (let i = 0; i < count; i++) {
    await productsPage.addToCartByIndex(i);
  }
});

When('pengguna membuka halaman keranjang', async ({ productsPage, cartPage }) => {
  await productsPage.openCart();
  await cartPage.isOnCartPage();
});

When('pengguna menghapus item dari keranjang', async ({ cartPage }) => {
  await cartPage.removeItem(0);
});

When('pengguna mengklik "Remove" pada produk pertama', async ({ productsPage }) => {
  await productsPage.removeFromCartByIndex(0);
});

Given('pengguna sudah menambahkan produk pertama ke keranjang', async ({ productsPage }) => {
  await productsPage.addToCartByIndex(0);
});

Then('badge keranjang menampilkan angka {string}', async ({ productsPage }, count) => {
  await expect(productsPage.cartBadge).toHaveText(count);
});

Then('badge keranjang tidak muncul', async ({ productsPage }) => {
  await expect(productsPage.cartBadge).not.toBeVisible();
});

Then('tombol produk berubah menjadi "Remove"', async ({ page }) => {
  await expect(page.locator('[data-test^="remove-"]').first()).toBeVisible();
});

Then('keranjang kosong dan tidak ada item yang ditampilkan', async ({ cartPage }) => {
  expect(await cartPage.itemCount()).toBe(0);
});

Then('item di keranjang cocok dengan produk yang ditambahkan', async ({ cartPage }) => {
  expect(await cartPage.itemCount()).toBeGreaterThan(0);
  const name = await cartPage.firstItemName();
  expect(name).toBeTruthy();
});

Then('harga item ditampilkan dengan benar', async ({ cartPage }) => {
  const price = await cartPage.firstItemPrice();
  expect(price).toBeGreaterThan(0);
});
