@cart
Feature: Keranjang Belanja SauceDemo

  Background:
    Given pengguna sudah login sebagai standard_user
    And pengguna berada di halaman produk

  Rule: Produk bisa ditambahkan ke keranjang

    @TC-SD-CART-001 @smoke @core
    Scenario: Tambah satu produk ke keranjang
      When pengguna menambahkan produk pertama ke keranjang
      Then badge keranjang menampilkan angka "1"
      And tombol produk berubah menjadi "Remove"

    @TC-SD-CART-002 @regression
    Scenario: Tambah beberapa produk ke keranjang
      When pengguna menambahkan 3 produk ke keranjang
      Then badge keranjang menampilkan angka "3"

  Rule: Produk bisa dihapus dari keranjang

    @TC-SD-CART-003 @regression
    Scenario: Hapus produk dari halaman produk
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna mengklik "Remove" pada produk pertama
      Then badge keranjang tidak muncul

    @TC-SD-CART-004 @regression
    Scenario: Hapus produk dari halaman keranjang
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna membuka halaman keranjang
      And pengguna menghapus item dari keranjang
      Then keranjang kosong dan tidak ada item yang ditampilkan

  Rule: Keranjang menampilkan detail yang benar

    @TC-SD-CART-005 @smoke
    Scenario: Halaman keranjang menampilkan produk yang ditambahkan
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna membuka halaman keranjang
      Then item di keranjang cocok dengan produk yang ditambahkan
      And harga item ditampilkan dengan benar
