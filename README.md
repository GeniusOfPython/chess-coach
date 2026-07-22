# Chess Coach

Шахматный тренер на React, TypeScript и Vite. Проект включает локальный
Stockfish, PWA-режим, разбор партий, тренировку ошибок и диагностический первый
запуск. Коммерческий контур использует отдельное проверяемое право доступа:
Free по умолчанию, Premium или ограниченный по сроку временный доступ.

## Требования

- Node.js версии из `.nvmrc` или новее;
- npm;
- Chromium и WebKit Playwright для полного релизного прогона.

## Первый запуск

```bash
npm ci
npm run test:e2e:install
npm run check:ci
```

Для повседневной проверки без браузерных сценариев:

```bash
npm run check
```

Для отдельной production-сборки:

```bash
npm run build
```

## Обязательный порядок проверки изменений

1. `npm run check` — архитектура, единое состояние E2E, линтер, unit-тесты,
   factual eval, production-сборка, PWA и performance-бюджеты.
2. `npm run check:ci` — тот же gate плюс все Chromium/WebKit E2E.
3. `npm run build` — контрольная production-сборка перед передачей версии.

`check:ci` самостоятельно собирает production-версию перед запуском браузерных
тестов. Не запускайте E2E на старом каталоге `dist`.

## Конфигурация

Скопируйте `.env.example` в `.env.local` и заполните локальные значения.
`.env.local` содержит секреты и не должен попадать в Git или архивы проекта.

## Диагностика E2E

```bash
npm run test:e2e:onboarding
npm run test:e2e:a11y
npm run test:e2e:repetition
```

Все E2E-сценарии обязаны создавать состояние через `e2e/testHarness.ts`.
Прямая инициализация `localStorage` в spec-файле блокируется quality gate.

Подробное устройство проверки описано в `docs/quality-gate.md`.

## Право Premium

Тариф не является пользовательской настройкой. Его нельзя переключить из UI.
Мобильный магазин подключается через
`src/platform/purchases/purchaseProvider.ts`, а серверные функции независимо
проверяют право и квоты. Старый ключ `chess-coach.subscription-tier` не даёт
доступа.
