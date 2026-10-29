@products
Feature: Daftar Produk SauceDemo

  Background:
    Given pengguna sudah login sebagai standard_user
    And pengguna berada di halaman produk

  Rule: Halaman produk menampilkan semua item

    @TC-SD-PROD-001 @smoke @core
    Scenario: Semua 6 produk ditampilkan
      Then halaman menampilkan 6 produk
      And setiap produk memiliki nama, harga, dan tombol Add to cart

    @TC-SD-PROD-002 @regression
    Scenario: Filter harga rendah ke tinggi bekerja
      When pengguna memilih filter "Price (low to high)"
      Then produk pertama adalah yang berharga paling murah

    @TC-SD-PROD-003 @regression
    Scenario: Filter harga tinggi ke rendah bekerja
      When pengguna memilih filter "Price (high to low)"
      Then produk pertama adalah yang berharga paling mahal

    @TC-SD-PROD-004 @regression
    Scenario: Filter nama A ke Z bekerja
      When pengguna memilih filter "Name (A to Z)"
      Then produk pertama secara alfabet adalah yang paling awal

  Rule: Detail produk bisa dibuka

    @TC-SD-PROD-005 @regression
    Scenario: Halaman detail produk menampilkan informasi lengkap
      When pengguna mengklik produk pertama
      Then halaman detail menampilkan nama produk
      And halaman detail menampilkan harga produk
      And halaman detail menampilkan deskripsi produk
      And tombol "Add to cart" tersedia
