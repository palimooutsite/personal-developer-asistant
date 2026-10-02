# Personal Developer Assistant — Documentation

Dokumentasi ini adalah referensi fungsional, arsitektur, database, API, frontend, dan source-code untuk branch dev/project-members-api.

## Daftar Dokumen

1. 01-functional-architecture.md — fungsi aplikasi, aktor, arsitektur, business rules, flow dan ERD konseptual.
2. 02-database.md — tabel, kolom, relasi, index, enum dan ERD.
3. 03-backend-api.md — endpoint API, guard, parameter dan cara penggunaan.
4. 04-frontend.md — halaman User Application dan Platform Admin.
5. 05-code-file-reference.md — tanggung jawab file source utama.

## Topologi

    Browser
       |
       +---- frontend-personal-app :3001
       |
       +---- frontend-personal-admin :3003
                    |
                    v
              backend-personal-app :3002
                    |
                    v
              PostgreSQL

Development frontend menggunakan /backend-api sebagai proxy menuju backend lokal.

## Prinsip

Dokumentasi mengikuti implementasi repository saat ini. Kemampuan yang belum terdapat di source code tidak dianggap sudah tersedia.