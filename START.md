# 🚀 Быстрый запуск

## Шаг 1: Установка зависимостей
```bash
npm install
```

## Шаг 2: Исправление лимита file watchers (Linux)

⚠️ **Важно для Linux!** Иначе получите ошибку ENOSPC.

```bash
./fix-watchers.sh
```

Или вручную:
```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

Подробности: [FIX-WATCHERS.md](FIX-WATCHERS.md)

## Шаг 3: Проверка подключения к Directus (опционально)
```bash
npm run check-directus
```

Этот скрипт проверит:
- Доступность сервера Directus
- Наличие коллекции `owners`
- Наличие коллекции `projects`
- Права доступа токена

## Шаг 4: Запуск приложения
```bash
npm run dev
```

Приложение откроется по адресу: **http://localhost:3000**

## Шаг 5: Вход в систему

Используйте один из аккаунтов:

### Руководитель (полный доступ)
- **Логин:** `director`
- **Пароль:** `password`
- Доступ к собственникам и проектам

### Менеджер (только проекты)
- **Логин:** `manager`
- **Пароль:** `password`
- Доступ только к проектам

## 📦 Сборка для продакшена

```bash
npm run build
```

Готовые файлы будут в папке `dist/`

## 🔍 Предпросмотр продакшен-сборки

```bash
npm run preview
```

## ⚠️ Возможные проблемы

### Ошибка ENOSPC: file watchers (Linux)
```
Error: ENOSPC: System limit for number of file watchers reached
```
**Решение:** Запустите `./fix-watchers.sh` или смотрите [FIX-WATCHERS.md](FIX-WATCHERS.md)

### Ошибка CORS (уже исправлена!)
✅ В проекте настроен прокси для обхода CORS в режиме разработки.
Если всё равно видите ошибки CORS, смотрите [CORS-РЕШЕНО.md](CORS-РЕШЕНО.md)

### Ошибка подключения к Directus
1. Убедитесь, что Directus запущен и доступен по адресу https://1.cycloscope.online
2. Проверьте токен в файле `.env.local`
3. Для продакшена настройте CORS в Directus (Settings → Project Settings → CORS)

### Коллекции не найдены
Создайте в Directus коллекции:
- `owners` - для собственников
- `projects` - для проектов

Структуру полей смотрите в [DEPLOY.md](DEPLOY.md)

### Ошибка прав доступа
Убедитесь, что токен имеет права на чтение и запись в коллекции `owners` и `projects`

## 📚 Дополнительная информация

- [DEPLOY.md](DEPLOY.md) - Подробная инструкция по деплою
- [README.md](README.md) - Общая информация о проекте
