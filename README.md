# Панель управления собственниками и проектами

React-приложение для управления собственниками апартаментов и проектами с интеграцией Directus CMS.

## Возможности

- 📋 Управление собственниками и их документами
- 📊 Управление проектами и задачами
- 👥 Разграничение прав доступа (Руководитель/Менеджер)
- 📎 Загрузка и версионирование документов
- 🔍 Фильтрация и сортировка данных
- 📱 Адаптивный дизайн

## Быстрый старт

**Требования:** Node.js 16+

1. Установите зависимости:
   ```bash
   npm install
   ```

2. Убедитесь, что файл `.env.local` содержит правильные данные Directus:
   ```
   VITE_DIRECTUS_URL=https://1.cycloscope.online
   VITE_DIRECTUS_STATIC_TOKEN=7JeEQ9bKtgX7onxJQZyGu8w8tCziiblV
   ```

3. Запустите приложение:
   ```bash
   npm run dev
   ```

4. Откройте http://localhost:3000

## Данные для входа

- **Руководитель**: `director` / `password`
- **Менеджер**: `manager` / `password`

## Деплой

Подробные инструкции по деплою смотрите в [DEPLOY.md](DEPLOY.md)

```bash
npm run build
npm run preview
```

## Технологии

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Directus CMS
