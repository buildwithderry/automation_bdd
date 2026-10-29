@auth
Feature: Login SauceDemo

  Background:
    Given pengguna membuka halaman login

  Rule: User valid bisa masuk ke halaman produk

    @TC-SD-AUTH-001 @smoke @core
    Scenario: Login berhasil dengan akun standard_user
      When pengguna masuk sebagai "standard_user" dengan password "secret_sauce"
      Then pengguna diarahkan ke halaman produk
      And judul halaman menampilkan "Products"
      And tombol keranjang terlihat di header

    @TC-SD-AUTH-002 @regression
    Scenario: Logout berhasil setelah login
      When pengguna masuk sebagai "standard_user" dengan password "secret_sauce"
      And pengguna membuka menu hamburger
      And pengguna mengklik "Logout"
      Then pengguna kembali ke halaman login

  Rule: User terkunci tidak bisa masuk

    @TC-SD-AUTH-003 @smoke
    Scenario: Login ditolak untuk akun terkunci
      When pengguna masuk sebagai "locked_out_user" dengan password "secret_sauce"
      Then pesan error ditampilkan berisi "locked out"
      And pengguna tetap di halaman login

  Rule: Kredensial salah menghasilkan pesan error

    @TC-SD-AUTH-004 @regression
    Scenario: Login ditolak dengan password salah
      When pengguna masuk sebagai "standard_user" dengan password "password_salah"
      Then pesan error ditampilkan berisi "do not match"

    @TC-SD-AUTH-005 @regression
    Scenario: Login ditolak dengan username kosong
      When pengguna menekan tombol Login tanpa mengisi username
      Then pesan error ditampilkan berisi "Username is required"
