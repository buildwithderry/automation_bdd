const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { Given, When, Then } = require('../../fixtures/saucedemo.bdd.fixture');

When('pengguna melanjutkan ke checkout', async ({ cartPage }) => {
  await cartPage.checkout();
});

When('pengguna membatalkan dari halaman checkout', async ({ checkoutPage }) => {
  await checkoutPage.cancel();
});

When('pengguna mengisi informasi checkout dengan data valid', async ({ checkoutPage }) => {
  await checkoutPage.fillInformation({
    firstName: faker.person.firstName(),
    lastName:  faker.person.lastName(),
    zipCode:   faker.location.zipCode('#####'),
  });
  await checkoutPage.continue();
});

When('pengguna menekan Continue tanpa mengisi form', async ({ checkoutPage }) => {
  await checkoutPage.continue();
});

When('pengguna mengisi First Name dan Last Name tapi tidak Zip Code', async ({ checkoutPage }) => {
  await checkoutPage.fillInformation({
    firstName: faker.person.firstName(),
    lastName:  faker.person.lastName(),
    zipCode:   '',
  });
});

When('pengguna menekan Continue', async ({ checkoutPage }) => {
  await checkoutPage.continue();
});

When('pengguna menyelesaikan order', async ({ checkoutPage }) => {
  await checkoutPage.finish();
});

Then('halaman Overview menampilkan item yang dipesan', async ({ checkoutPage }) => {
  expect(await checkoutPage.overviewItemCount()).toBeGreaterThan(0);
});

Then('halaman Overview menampilkan {int} item', async ({ checkoutPage }, count) => {
  expect(await checkoutPage.overviewItemCount()).toBe(count);
});

Then('total harga ditampilkan dengan benar', async ({ checkoutPage }) => {
  const total = await checkoutPage.totalText();
  expect(total).toMatch(/Total: \$/);
});

Then('halaman konfirmasi menampilkan {string}', async ({ checkoutPage }, text) => {
  const header = await checkoutPage.completeHeaderText();
  expect(header).toContain(text);
});

Then('pesan error muncul berisi {string}', async ({ checkoutPage }, text) => {
  const err = await checkoutPage.errorText();
  expect(err).toContain(text);
});

Then('pengguna kembali ke halaman keranjang', async ({ cartPage }) => {
  await cartPage.isOnCartPage();
});

Then('item yang ditambahkan masih ada di keranjang', async ({ cartPage }) => {
  expect(await cartPage.itemCount()).toBeGreaterThan(0);
});
