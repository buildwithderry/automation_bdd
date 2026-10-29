@checkout @e2e
Feature: Checkout End-to-End SauceDemo

  Background:
    Given pengguna sudah login sebagai standard_user
    And pengguna berada di halaman produk

  Rule: Flow checkout lengkap bisa diselesaikan

    @TC-SD-CHK-001 @smoke @core @e2e
    Scenario: Checkout berhasil dari tambah produk sampai order complete
      When pengguna menambahkan produk pertama ke keranjang
      And pengguna membuka halaman keranjang
      And pengguna melanjutkan ke checkout
      And pengguna mengisi informasi checkout dengan data valid
      Then halaman Overview menampilkan item yang dipesan
      And total harga ditampilkan dengan benar
      When pengguna menyelesaikan order
      Then halaman konfirmasi menampilkan "Thank you for your order!"
      And tombol "Back Home" tersedia

    @TC-SD-CHK-002 @regression
    Scenario: Checkout beberapa produk sekaligus
      When pengguna menambahkan 3 produk ke keranjang
      And pengguna membuka halaman keranjang
      And pengguna melanjutkan ke checkout
      And pengguna mengisi informasi checkout dengan data valid
      Then halaman Overview menampilkan 3 item
      When pengguna menyelesaikan order
      Then halaman konfirmasi menampilkan "Thank you for your order!"

  Rule: Validasi form checkout mencegah data kosong

    @TC-SD-CHK-003 @regression
    Scenario: Form checkout ditolak jika First Name kosong
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna membuka halaman keranjang
      And pengguna melanjutkan ke checkout
      And pengguna menekan Continue tanpa mengisi form
      Then pesan error muncul berisi "First Name is required"

    @TC-SD-CHK-004 @regression
    Scenario: Form checkout ditolak jika Zip Code kosong
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna membuka halaman keranjang
      And pengguna melanjutkan ke checkout
      And pengguna mengisi First Name dan Last Name tapi tidak Zip Code
      And pengguna menekan Continue
      Then pesan error muncul berisi "Postal Code is required"

  Rule: Pengguna bisa membatalkan checkout dan kembali ke keranjang

    @TC-SD-CHK-005 @regression
    Scenario: Cancel dari halaman checkout information kembali ke keranjang
      Given pengguna sudah menambahkan produk pertama ke keranjang
      When pengguna membuka halaman keranjang
      And pengguna melanjutkan ke checkout
      And pengguna membatalkan dari halaman checkout
      Then pengguna kembali ke halaman keranjang
      And item yang ditambahkan masih ada di keranjang
