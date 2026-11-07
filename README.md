<p align="center">
  <img src="public/miraku-logo.svg" alt="Miraku Logo" width="120" height="120" />
</p>

<h1 align="center">Miraku</h1>

<p align="center">
  <strong>Аниме онлайн — удобный каталог, просмотр и отслеживание серий.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## Возможности

- Просмотр каталога, поиск, популярное и трендовое аниме на основе AniList.
- Страница аниме с подробной информацией, связанными тайтлами и расписанием.
- Видеоплеер ArtPlayer с HLS, управлением субтитрами и пропуском опенингов/эндингов.
- Несколько резервных видеосерверов.
- PWA: установка на телефон и компьютер.
- История просмотра и продолжение просмотра.
- Необязательная синхронизация аккаунтов через PocketBase.

## Быстрый запуск

Требуется Node.js 18 или новее.

```bash
npm install
npm run dev
```

Откройте http://localhost:3000.

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните необходимые значения. Секретные ключи храните только в серверных переменных окружения и не добавляйте их в Git.

## Docker

```bash
docker compose up -d
```

## Лицензия

Проект распространяется по лицензии MIT. Подробности — в файле LICENSE.
