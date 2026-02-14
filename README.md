# 🐞 Bug Report Widget

Легковесный встраиваемый виджет для сбора баг-репортов со скриншотами.
Мульти-тенантный SaaS: каждый клиент получает API-ключ, репорты идут в **его** Telegram и/или Notion.

## Быстрый старт

### 1. Установка виджета (для клиента)

```html
<script>
  window.BugWidgetConfig = {
    apiKey: 'brw_XXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  };
</script>
<script src="https://cdn.your-domain.com/widget.iife.js" defer></script>
```

> API URL зашит в виджет при сборке. Клиенту указывать его не нужно.

### 2. Локальная разработка

```bash
npm install
npm run dev       # → http://localhost:3000/demo.html
npm run build     # → dist/widget.iife.js
```

> Перед продакшн-сборкой укажите URL вашего Worker'а в `.env.production`:
> ```
> VITE_API_URL=https://bug-report-api.YOUR-ACCOUNT.workers.dev/api/report
> ```

### 3. Настройка базы данных

1. Создать проект на [supabase.com](https://supabase.com)
2. Выполнить `supabase/migration.sql` в SQL Editor
3. Создать бакет `bug-reports` в Storage (публичный доступ на чтение)

### 4. Деплой Worker API

> **Подробная инструкция:** [📚 Deployment Guide](file:///C:/Users/Kotoshka/.gemini/antigravity/brain/d54d0d1d-30ab-4a03-93cf-bae875f4f7f5/deployment_guide.md)

```bash
cd worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_KEY
npx wrangler deploy
```

### 5. Управление клиентами

```bash
# Задать переменные окружения
$env:SUPABASE_URL = "https://xxx.supabase.co"
$env:SUPABASE_KEY = "eyJ..."

# Добавить клиента с Telegram
node scripts/admin.js add "Иван Иванов" --tg-token=123:ABC --tg-chat=456

# Добавить клиента с Notion
node scripts/admin.js add "Компания X" --notion-key=secret_XXX --notion-db=DB_ID

# Список клиентов
node scripts/admin.js list
```

## Структура проекта

```
BugReportWidget/
├── src/widget/          # Frontend — виджет (Shadow DOM)
├── worker/              # Backend — Cloudflare Worker (API Gateway)
├── supabase/            # SQL-миграция (clients, reports)
├── scripts/             # Admin CLI (управление клиентами)
├── demo.html            # Демо-страница
├── vite.config.js       # Сборка виджета (IIFE)
└── package.json
```

## Архитектура

```
Сайт клиента           Cloudflare Worker          Supabase
┌──────────┐           ┌───────────────┐          ┌──────────┐
│ Widget   │──POST────▶│ /api/report   │──lookup─▶│ clients  │
│ (apiKey) │           │               │          │ table    │
└──────────┘           │  ┌─validate   │          └──────────┘
                       │  ├─upload img─│─────────▶│ Storage  │
                       │  ├─send TG    │          └──────────┘
                       │  ├─send Notion│
                       │  └─log report │─────────▶│ reports  │
                       └───────────────┘          └──────────┘
```

## Настройка внешних сервисов

### Telegram
1. Создать бота через [@BotFather](https://t.me/BotFather) → `BOT_TOKEN`
2. Узнать `CHAT_ID` через [@userinfobot](https://t.me/userinfobot)

### Notion
1. Создать интеграцию на [developers.notion.com](https://developers.notion.com)
2. Создать базу с полями: `Name` (title), `Comment`, `URL`, `Browser`, `OS`, `Screen`, `Status` (select)
3. Дать интеграции доступ к базе
