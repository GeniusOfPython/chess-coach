# Chess Coach

Шахматный тренер на React, TypeScript, Vite и Capacitor. Одна кодовая база
собирается как Web/PWA, Android и iOS. Проект включает локальный Stockfish,
разбор партий, тренировку ошибок и диагностический первый запуск. Коммерческий
контур использует отдельное проверяемое право доступа: Free по умолчанию,
Premium или ограниченный по сроку временный доступ.

## Требования

- Node.js версии из `.nvmrc` или новее;
- npm;
- Chromium и WebKit Playwright для полного релизного прогона.
- Android Studio/JDK 21 для Android-сборки;
- macOS и Xcode для iOS-сборки.

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

1. `npm run check` — архитектура, единое состояние E2E, целостность Android/iOS,
   линтер, unit-тесты, factual eval, production-сборка, PWA и бюджеты.
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
npm run test:e2e:entitlement
```

Все E2E-сценарии обязаны создавать состояние через `e2e/testHarness.ts`.
Прямая инициализация `localStorage` в spec-файле блокируется quality gate.

Подробное устройство проверки описано в `docs/quality-gate.md`.

## Мобильная сборка

Синхронизировать web-артефакт и плагины с обеими платформами:

```bash
npm run mobile:sync
```

Открыть Android Studio или Xcode:

```bash
npm run mobile:android
npm run mobile:ios
```

`mobile:ios` выполняется только на macOS. Инструкции и границы нативного слоя —
в `docs/native-mobile-build.md`.

## Право Premium

Тариф не является пользовательской настройкой. Его нельзя переключить из UI.
Мобильный магазин подключается через
`src/platform/purchases/purchaseProvider.ts`, а серверные функции независимо
проверяют право и квоты. Старый ключ `chess-coach.subscription-tier` не даёт
доступа. Запись entitlement в `localStorage` также не является доказательством
покупки: Premium активируется только ответом адаптера текущей сессии. Офлайн-
подтверждение действует максимум 72 часа и никогда не переживает дату окончания
подписки.
