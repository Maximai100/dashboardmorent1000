# 🔧 Исправление ошибок с undefined массивами в проектах

## Проблемы

### 1. Ошибка в модальном окне проекта
```
Uncaught TypeError: can't access property "map", editableProject.history is undefined
ProjectDetailModal.tsx:240
```

### 2. Ошибка в строке таблицы проектов
```
Uncaught TypeError: can't access property "length", project.attachments is undefined
ProjectRow.tsx:81
```

## Причина

Когда создается новый проект или данные приходят из Directus, некоторые поля (`history`, `tags`, `attachments`) могут быть `undefined` или `null`, но код пытался вызвать методы массивов (`.map()`, `.length`, `.some()`) без проверки.

## Решение

### 1. ProjectDetailModal.tsx

**Гарантированная инициализация всех полей:**
```typescript
const initialProject: Project = {
    ...project,
    history: project.history || [],
    tags: project.tags || [],
    attachments: project.attachments || [],
    notes: project.notes || '',
};
```

**Проверка перед рендерингом истории:**
```typescript
{editableProject.history && editableProject.history.length > 0 ? (
    // Показать историю
) : (
    <p>История изменений пока пуста</p>
)}
```

### 2. ProjectRow.tsx

**Проверка tags перед map:**
```typescript
{project.tags && project.tags.length > 0 ? (
    project.tags.map((tag) => ...)
) : (
    <span>—</span>
)}
```

**Проверка attachments перед length:**
```typescript
{!project.attachments || project.attachments.length === 0 ? (
    <span>Нет вложений</span>
) : (
    // Показать вложения
)}
```

### 3. ManagerDashboard.tsx

**Безопасная фильтрация по тегам:**
```typescript
(project.tags && project.tags.some(tag => ...))
```

**Безопасная фильтрация по вложениям:**
```typescript
project.attachments?.some(att => ...) || false
```

## Исправленные файлы

- ✅ `components/manager/ProjectDetailModal.tsx`
- ✅ `components/manager/ProjectRow.tsx`
- ✅ `components/manager/ManagerDashboard.tsx`

## Результат

✅ Модальное окно нового проекта открывается без ошибок
✅ Таблица проектов отображается корректно
✅ Фильтрация и поиск работают без ошибок
✅ Все поля корректно инициализированы
✅ Можно создавать, редактировать и сохранять проекты

## Проверка

1. Запустите приложение: `npm run dev`
2. Войдите в систему
3. Перейдите на вкладку "Проекты"
4. Нажмите "Новый проект"
5. Модальное окно должно открыться без ошибок
6. Заполните данные и сохраните

Всё должно работать! 🎉
