# 🐞 Errora

Легковесный встраиваемый виджет для сбора баг-репортов со скриншотами.
Мульти-тенантный SaaS: каждый клиент получает API-ключ, репорты идут в **его** Telegram и/или Notion.

## Быстрый старт

### 1. Установка виджета (для клиента)

```html
<script>
  window.ErroraWidgetConfig = {
    apiKey: 'err_XXXXXXXXXXXXXXXXXXXXXXXXXXXX'
  };
</script>
<script src="https://cdn.your-domain.com/errora-widget.iife.js" defer></script>
```

> API URL зашит в виджет при сборке. Клиенту указывать его не нужно.

### 2. Локальная разработка

```bash
npm install
npm run dev       # → http://localhost:3000/demo.html
npm run build     # → dist/errora-widget.iife.js
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

## 🛠 Технологический стек

### Основные компоненты
- **Виджет (Widget)**: Vanilla JavaScript, Web Components (Shadow DOM), `html2canvas` и нативный `getDisplayMedia` API (скриншоты).
- **Панель управления (Dashboard)**: React 19, React Router, Vite, React-i18next (мультиязычность), Custom CSS (Glassmorphism & шрифт Outfit).
- **Бэкенд (API Gateway)**: Cloudflare Workers (Serverless) для маршрутизации, валидации и интеграций.
- **База данных и Хранилище**: Supabase (PostgreSQL) для хранения настроек клиентов и репортов, Supabase Storage для загрузки скриншотов.
- **Интеграции**: Telegram Bot API, Slack API (OAuth), Discord API, Notion API.

## 🏗 Детали реализации

### 1. Встраиваемый виджет
- **Сборка**: Виджет собирается с помощью Vite в единый IIFE-файл (`errora-widget.iife.js`), что позволяет встраивать его на любой клиентский сайт минимальным фрагментом `<script>`.
- **Изоляция стилей**: Интерфейс приложения инкапсулирован в **Shadow DOM**, что на 100% предотвращает конфликты стилей между виджетом и основным сайтом.
- **Оптимизация скриншотов**: Использует гибридную стратегию захвата экрана. В приоритетном режиме задействуется нативное API `getDisplayMedia` для создания высокоточных скриншотов, а в случае отсутствия поддержки (например, на мобильных устройствах или из-за отказа в разрешениях) срабатывает фоллбек на рендеринг DOM с помощью `html2canvas`.

### 2. Бэкенд и API (Cloudflare Workers)
- **Serverless Архитектура**: Вычисления расположены "на краях" (Edge Computing), обеспечивая мгновенный отклик и минимальные задержки по всему миру.
- **API Gateway**: Воркер обрабатывает входящие репорты, валидирует нагрузку, загружает изображения в Supabase Storage и маршрутизирует баг-репорты в подключенные трекеры (Telegram, Slack, Discord, Notion).
- **Управление доступом**: Безопасность обеспечивается "Magic Link" подходом и хэшированными секретами, хранимыми в Postgres, а также ключами API на основе тенантной модели.
- **OAuth-флоу**: Безупречно обрабатывает OAuth 2.0 потоки аутентификации для прозрачной интеграции сторонних сервисов (Notion, Slack).

### 3. Дашборд (React SPA)
- **Современный UI/UX**: Разработан с использованием премиального тренда Glassmorphism. Включает динамические анимированные градиентные фоны (background shapes), плавные микро-анимации и кастомную типографику 'Outfit'.
- **SPA Управление**: Админ-панель представляет собой реактивное одностраничное приложение с удобной маршрутизацией через `react-router-dom`.
- **Конфигуратор виджетов**: Помимо просмотра логов, дашборд предоставляет UI для настройки визуальной составляющей виджета (позиционирование, локализация - i18next), позволяя скопировать сгенерированный JS-сниппет.

## 🗺 Структура проекта

```text
Errora/
├── src/dashboard/       # Frontend — дашборд панели управления (React)
├── src/widget/          # Frontend — встраиваемый виджет (Vanilla JS)
├── worker/              # Backend — Cloudflare Worker (API, OAuth)
├── supabase/            # База данных — SQL-миграции (PostgreSQL)
├── scripts/             # Admin CLI (управление клиентами из консоли)
├── demo.html            # Демо-страница виджета
├── dashboard.html       # Entrypoint дашборда
└── package.json
```

## ⚙️ Техническая схема взаимодействия

```text
Сайт клиента           Cloudflare Worker          Supabase Database
┌──────────┐           ┌───────────────┐          ┌──────────┐
│ Widget   │──POST────▶│ /api/report   │──lookup─▶│ clients  │
│ (apiKey) │           │               │          │ table    │
└──────────┘           │  ┌─validate   │          └──────────┘
                       │  ├─upload img─│─────────▶│ Storage  │
                       │  ├─send TG/DS │          └──────────┘
                       │  ├─send Notion│
                       │  ├─send Slack │
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
