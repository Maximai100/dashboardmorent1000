# 🔧 Исправление ошибки CORS

## Проблема

Браузер блокирует запросы к Directus из-за политики CORS:
```
CORS header 'Access-Control-Allow-Origin' missing
```

## Решение

Нужно настроить CORS в Directus, чтобы разрешить запросы с вашего домена.

### Вариант 1: Через веб-интерфейс Directus (рекомендуется)

1. Откройте Directus: https://1.cycloscope.online
2. Войдите как администратор
3. Перейдите в **Settings** (⚙️) → **Project Settings**
4. Найдите раздел **CORS**
5. Добавьте разрешенные источники:
   ```
   http://localhost:3000
   http://127.0.0.1:3000
   ```
6. Если планируете деплой, добавьте также ваш продакшен домен
7. Нажмите **Save**

### Вариант 2: Через .env файл Directus (на сервере)

Если у вас есть доступ к серверу Directus, отредактируйте файл `.env`:

```env
# Разрешить все источники (только для разработки!)
CORS_ENABLED=true
CORS_ORIGIN=*

# Или конкретные домены (для продакшена)
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000,https://ваш-домен.com
```

После изменений перезапустите Directus:
```bash
docker-compose restart  # если используете Docker
# или
pm2 restart directus    # если используете PM2
```

### Вариант 3: Временное решение через прокси (для разработки)

Если нет доступа к настройкам Directus, можно использовать прокси в Vite.

Обновите `vite.config.ts`:

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'https://1.cycloscope.online',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            secure: false,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

И обновите `config.ts`:

```typescript
// Для разработки используем прокси
export const DIRECTUS_URL = import.meta.env.DEV 
  ? '/api' 
  : (import.meta.env.VITE_DIRECTUS_URL || 'https://1.cycloscope.online');

export const DIRECTUS_TOKEN = import.meta.env.VITE_DIRECTUS_STATIC_TOKEN || '7JeEQ9bKtgX7onxJQZyGu8w8tCziiblV';
```

## Проверка

После настройки CORS:

1. Перезапустите приложение:
   ```bash
   npm run dev
   ```

2. Откройте http://localhost:3000

3. Откройте консоль браузера (F12)

4. Ошибки CORS должны исчезнуть

## Дополнительные настройки CORS в Directus

Если нужны более детальные настройки, в Directus можно настроить:

- **CORS_CREDENTIALS** - разрешить отправку cookies
- **CORS_METHODS** - разрешенные HTTP методы (GET, POST, PATCH, DELETE)
- **CORS_ALLOWED_HEADERS** - разрешенные заголовки
- **CORS_EXPOSED_HEADERS** - заголовки, доступные клиенту

Пример полной конфигурации в `.env` Directus:

```env
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000,https://ваш-домен.com
CORS_METHODS=GET,POST,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization
CORS_EXPOSED_HEADERS=Content-Range
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

## Что делать, если ничего не помогает?

1. Проверьте, что Directus действительно запущен и доступен
2. Убедитесь, что токен валиден
3. Проверьте права доступа токена к коллекциям
4. Попробуйте использовать расширение браузера для отключения CORS (только для разработки!)
5. Свяжитесь с администратором сервера Directus

## Безопасность

⚠️ **Важно:**
- Не используйте `CORS_ORIGIN=*` в продакшене!
- Всегда указывайте конкретные домены
- Храните токены в безопасности
- Используйте HTTPS в продакшене
