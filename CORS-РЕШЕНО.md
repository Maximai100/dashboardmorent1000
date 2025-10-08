# ✅ CORS проблема решена!

## Что было сделано:

1. **Добавлен прокси в `vite.config.ts`**
   - Все запросы к `/api` перенаправляются на Directus
   - Это обходит ограничения CORS в режиме разработки

2. **Обновлен `config.ts`**
   - В режиме разработки используется `/api` (прокси)
   - В продакшене используется прямой URL Directus

## Как это работает:

```
Браузер → http://localhost:3000/api/items/owners
            ↓
Vite прокси → https://1.cycloscope.online/items/owners
            ↓
Directus → Ответ
```

Браузер думает, что запрос идет на тот же домен (localhost:3000), поэтому CORS не срабатывает.

## Запуск:

```bash
npm run dev
```

Откройте: http://localhost:3000

Ошибки CORS больше не должны появляться! 🎉

## Для продакшена:

Для продакшен-деплоя всё равно нужно настроить CORS в Directus:

1. Откройте Directus: https://1.cycloscope.online
2. Settings → Project Settings → CORS
3. Добавьте ваш продакшен домен
4. Сохраните

Или в `.env` файле Directus:
```env
CORS_ENABLED=true
CORS_ORIGIN=https://ваш-домен.com
```

## Проверка:

После запуска `npm run dev`:
- Откройте консоль браузера (F12)
- Перейдите на вкладку Network
- Вы должны видеть успешные запросы к `/api/items/owners` и `/api/items/projects`
- Статус: 200 OK
- Без ошибок CORS

## Альтернативное решение:

Если прокси не работает, смотрите подробную инструкцию в [FIX-CORS.md](FIX-CORS.md)
