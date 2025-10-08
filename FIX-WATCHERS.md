# 🔧 Исправление ошибки ENOSPC (file watchers)

## Проблема

```
Error: ENOSPC: System limit for number of file watchers reached
```

Это ограничение Linux на количество файлов, которые система может отслеживать одновременно.

## Быстрое решение

### Временное (до перезагрузки):

```bash
sudo sysctl fs.inotify.max_user_watches=524288
sudo sysctl -p
```

### Постоянное (сохраняется после перезагрузки):

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Проверка текущего значения:

```bash
cat /proc/sys/fs/inotify/max_user_watches
```

По умолчанию обычно: 8192 или 65536
После исправления будет: 524288

## После исправления:

```bash
npm run dev
```

Приложение должно запуститься без ошибок! 🎉

## Альтернативное решение (если нет sudo):

Если у вас нет прав sudo, можно отключить hot reload в Vite.

Обновите `vite.config.ts`:

```typescript
server: {
  port: 3000,
  host: '0.0.0.0',
  watch: {
    usePolling: true,  // Использовать polling вместо watchers
  },
  proxy: {
    // ... остальное
  }
}
```

Но это замедлит hot reload, поэтому лучше увеличить лимит watchers.

## Почему это происходит?

- Node.js проекты содержат много файлов (особенно в node_modules)
- Vite отслеживает изменения файлов для hot reload
- Linux имеет ограничение на количество одновременно отслеживаемых файлов
- Увеличение лимита решает проблему

## Безопасно ли это?

✅ Да, это стандартная практика для разработчиков на Linux.
Многие IDE и инструменты разработки требуют увеличения этого лимита.
