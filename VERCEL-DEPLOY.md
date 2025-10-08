# 🚀 Деплой на Vercel - Инструкция

## Проблема

На Vercel появляются CORS ошибки:
```
CORS header 'Access-Control-Allow-Origin' missing
```

Это происходит потому, что прокси Vite работает только в режиме разработки. В продакшене нужно настроить CORS в Directus.

## Решение

### Шаг 1: Настройте CORS в Directus

#### Вариант А: Через веб-интерфейс (рекомендуется)

1. Откройте Directus: https://1.cycloscope.online
2. Войдите как администратор
3. Перейдите в **Settings** (⚙️) → **Project Settings**
4. Найдите раздел **CORS**
5. В поле **Allowed Origins** добавьте:
   ```
   https://dashboardmorent.vercel.app
   ```
6. Если у вас несколько доменов, добавьте их через запятую:
   ```
   http://localhost:3000,https://dashboardmorent.vercel.app
   ```
7. Нажмите **Save**

#### Вариант Б: Через .env файл Directus (на сервере)

Если у вас есть доступ к серверу Directus, отредактируйте файл `.env`:

```env
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000,https://dashboardmorent.vercel.app
CORS_METHODS=GET,POST,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization
CORS_EXPOSED_HEADERS=Content-Range
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

После изменений перезапустите Directus:
```bash
docker-compose restart  # если используете Docker
# или
pm2 restart directus    # если используете PM2
# или
systemctl restart directus  # если используете systemd
```

### Шаг 2: Проверьте переменные окружения на Vercel

1. Откройте проект на Vercel: https://vercel.com/dashboard
2. Перейдите в **Settings** → **Environment Variables**
3. Убедитесь, что добавлены:
   ```
   VITE_DIRECTUS_URL=https://1.cycloscope.online
   VITE_DIRECTUS_STATIC_TOKEN=7JeEQ9bKtgX7onxJQZyGu8w8tCziiblV
   ```
4. Если их нет, добавьте и сделайте **Redeploy**

### Шаг 3: Пересоберите и задеплойте

После настройки CORS в Directus:

```bash
# Локально
npm run build

# Или через Vercel CLI
vercel --prod

# Или через Git
git add .
git commit -m "Fix CORS for production"
git push
```

Vercel автоматически пересоберет проект.

## Проверка

1. Откройте https://dashboardmorent.vercel.app
2. Откройте консоль браузера (F12)
3. Ошибки CORS должны исчезнуть
4. Данные должны загружаться из Directus

## Дополнительные настройки Vercel

### vercel.json (опционально)

Если нужны дополнительные настройки, создайте `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Настройка заголовков (если CORS всё еще не работает)

Добавьте в `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

⚠️ **Внимание:** Это не заменяет настройку CORS в Directus! Directus всё равно должен разрешать запросы с вашего домена.

## Troubleshooting

### Ошибка всё еще появляется

1. **Проверьте настройки CORS в Directus:**
   - Убедитесь, что домен добавлен правильно
   - Проверьте, что нет опечаток
   - Убедитесь, что изменения сохранены

2. **Очистите кеш:**
   - В браузере: Ctrl+Shift+R (жесткая перезагрузка)
   - На Vercel: Redeploy проекта

3. **Проверьте переменные окружения:**
   - Убедитесь, что `VITE_DIRECTUS_URL` указывает на правильный URL
   - Проверьте, что токен валиден

4. **Проверьте логи Directus:**
   - Посмотрите логи сервера Directus
   - Убедитесь, что запросы доходят до сервера

### Ошибка 401 Unauthorized

- Проверьте токен в переменных окружения Vercel
- Убедитесь, что токен имеет права на чтение/запись

### Ошибка 404 Not Found

- Проверьте, что коллекции `owners` и `projects` существуют в Directus
- Убедитесь, что URL Directus правильный

## Безопасность

⚠️ **Важно:**

1. **Не используйте `CORS_ORIGIN=*` в продакшене!**
   - Всегда указывайте конкретные домены

2. **Храните токены в безопасности:**
   - Используйте переменные окружения
   - Не коммитьте токены в Git

3. **Используйте HTTPS:**
   - И для Directus, и для фронтенда

4. **Ограничьте права токена:**
   - Дайте токену только необходимые права
   - Не используйте admin токен

## Итого

После настройки CORS в Directus приложение на Vercel должно работать так же, как на localhost! 🎉
