const { expect } = require('@playwright/test');

class CheckoutPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    // Step 1 — Information
    this.firstNameInput  = page.locator('[data-test="firstName"]');
    this.lastNameInput   = page.locator('[data-test="lastName"]');
    this.zipInput        = page.locator('[data-test="postalCode"]');
    this.continueBtn     = page.locator('[data-test="continue"]');
    this.cancelBtn       = page.locator('[data-test="cancel"]');
    this.errorMessage    = page.locator('[data-test="error"]');
    // Step 2 — Overview
    this.overviewItems   = page.locator('[data-test="cart-item"]');
    this.itemTotal       = page.locator('[data-test="subtotal-label"]');
    this.tax             = page.locator('[data-test="tax-label"]');
    this.total           = page.locator('[data-test="total-label"]');
    this.finishBtn       = page.locator('[data-test="finish"]');
    // Step 3 — Complete
    this.completeHeader  = page.locator('[data-test="complete-header"]');
    this.backHomeBtn     = page.locator('[data-test="back-to-products"]');
  }

  async fillInformation({ firstName, lastName, zipCode }) {
    if (firstName !== undefined) await this.firstNameInput.fill(firstName);
    if (lastName  !== undefined) await this.lastNameInput.fill(lastName);
    if (zipCode   !== undefined) await this.zipInput.fill(zipCode);
  }

  async continue() {
    await this.continueBtn.click();
  }

  async cancel() {
    await this.cancelBtn.click();
  }

  async finish() {
    await this.finishBtn.click();
  }

  async errorText() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return (await this.errorMessage.innerText()).trim();
  }

  async overviewItemCount() {
    return this.overviewItems.count();
  }

  async totalText() {
    return (await this.total.innerText()).trim();
  }

  async completeHeaderText() {
    return (await this.completeHeader.innerText()).trim();
  }
}

module.exports = { CheckoutPage };
