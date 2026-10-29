const { expect } = require('@playwright/test');

class ProductsPage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.title        = page.locator('[data-test="title"]');
    this.items        = page.locator('[data-test="inventory-item"]');
    this.cartBadge    = page.locator('[data-test="shopping-cart-badge"]');
    this.cartLink     = page.locator('[data-test="shopping-cart-link"]');
    this.sortSelect   = page.locator('[data-test="product-sort-container"]');
    this.menuButton   = page.locator('#react-burger-menu-btn');
    this.logoutLink   = page.locator('[data-test="logout-sidebar-link"]');
  }

  async isOnProductsPage() {
    await expect(this.title).toHaveText('Products');
  }

  async itemCount() {
    return this.items.count();
  }

  /** Ambil semua produk sebagai array {name, price}. */
  async allProducts() {
    const names  = await this.page.locator('[data-test="inventory-item-name"]').allInnerTexts();
    const prices = await this.page.locator('[data-test="inventory-item-price"]').allInnerTexts();
    return names.map((name, i) => ({
      name: name.trim(),
      price: parseFloat(prices[i].replace('$', '')),
    }));
  }

  /** Klik tombol Add to cart / Remove pada item ke-n (0-indexed). */
  async addToCartByIndex(index = 0) {
    const item = this.items.nth(index);
    const name = (await item.locator('[data-test="inventory-item-name"]').innerText()).trim();
    await item.locator('button').click();
    return name;
  }

  async removeFromCartByIndex(index = 0) {
    const item = this.items.nth(index);
    await item.locator('button').click();
  }

  async cartBadgeCount() {
    if (!(await this.cartBadge.count())) return 0;
    return parseInt(await this.cartBadge.innerText(), 10);
  }

  async selectSort(option) {
    await this.sortSelect.selectOption({ label: option });
    await this.page.waitForTimeout(300);
  }

  async clickFirstProduct() {
    await this.items.first().locator('[data-test="inventory-item-name"]').click();
  }

  async openCart() {
    await this.cartLink.click();
  }

  async logout() {
    await this.menuButton.click();
    await this.logoutLink.waitFor({ state: 'visible' });
    await this.logoutLink.click();
  }
}

module.exports = { ProductsPage };
