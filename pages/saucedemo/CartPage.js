const { expect } = require('@playwright/test');

class CartPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.title         = page.locator('[data-test="title"]');
    this.cartItems     = page.locator('[data-test="cart-item"]');
    this.checkoutBtn   = page.locator('[data-test="checkout"]');
    this.continueBtn   = page.locator('[data-test="continue-shopping"]');
  }

  async isOnCartPage() {
    await expect(this.title).toHaveText('Your Cart');
  }

  async itemCount() {
    return this.cartItems.count();
  }

  async firstItemName() {
    return (await this.cartItems.first().locator('[data-test="inventory-item-name"]').innerText()).trim();
  }

  async firstItemPrice() {
    const text = await this.cartItems.first().locator('[data-test="inventory-item-price"]').innerText();
    return parseFloat(text.replace('$', ''));
  }

  async removeItem(index = 0) {
    await this.cartItems.nth(index).locator('button').click();
    await this.page.waitForTimeout(300);
  }

  async checkout() {
    await this.checkoutBtn.click();
  }
}

module.exports = { CartPage };
