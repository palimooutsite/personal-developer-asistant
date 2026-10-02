# Personal Developer Assistant — Documentation

Dokumentasi ini adalah referensi fungsional, arsitektur, database, API, frontend, dan source-code untuk branch dev/project-members-api.

## Daftar Dokumen

1. 01-functional-architecture.md — fungsi aplikasi, aktor, arsitektur, business rules, flow dan ERD konseptual.
2. 02-database.md — tabel, kolom, relasi, index, enum dan ERD.
3. 03-backend-api.md — endpoint API, guard, parameter dan cara penggunaan.
4. 04-frontend.md — halaman User Application dan Platform Admin.
5. 05-code-file-reference.md — tanggung jawab file source utama.
6. 06-technical-service-logic.md — logic service backend dan business rules.
7. 07-technical-frontend-flow.md — flow frontend, provider, component dan API client.
8. 08-development-guide.md — setup, development workflow, Prisma, testing dan deployment preparation.
9. 09-api-reference.md — referensi API operasional.
10. 10-deployment-guide.md — topology, environment, database, storage, security dan deployment.
11. 11-backend-logic-map.md — peta logic backend dan dependency antar service.
12. 12-troubleshooting-bug-location-guide.md — panduan menemukan lokasi bug berdasarkan layer.
13. 13-repository-structure-file-map.md — peta folder dan file repository.
14. 14-documentation-vs-source-audit.md — hasil audit dokumentasi terhadap source branch.

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