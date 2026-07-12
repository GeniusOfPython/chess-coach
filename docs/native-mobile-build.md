# Подготовка Android/iOS через Capacitor

Проект остаётся обычным React/Vite-приложением. Мобильная версия позже будет собираться как native shell через Capacitor: внутри Android/iOS-приложения будет открываться собранная web-версия из `dist`.

## Что уже подготовлено

- `capacitor.config.json` — базовая конфигурация мобильного приложения.
- `src/platform/nativeBridge.ts` — единое место для проверки платформы: web / android / ios.
- `src/platform/mobile.ts` — уже используется для скрытия рекламы в браузере и подготовки рекламы только для native mobile.
- `manifest.webmanifest`, `public/sw.js` и service worker — основа для офлайн-работы.

## Когда переходить к реальной мобильной сборке

Не сейчас. Сначала лучше довести web-версию до стабильной версии 1.0:

1. стабильная игра против бота;
2. понятный тренерский анализ;
3. удобный интерфейс;
4. импорт/экспорт PGN/FEN;
5. автосохранение;
6. офлайн-работа;
7. стабильная сборка `npm run build`.

После этого подключать Android/iOS.

## Будущие команды

Когда придёт время реально собирать мобильную версию, установить Capacitor:

```cmd
npm.cmd install @capacitor/core
npm.cmd install -D @capacitor/cli @capacitor/android @capacitor/ios
```

Добавить платформы:

```cmd
npx cap add android
npx cap add ios
```

Собрать web-версию и синхронизировать её с мобильными проектами:

```cmd
npm.cmd run build
npx cap sync
```

Открыть Android Studio:

```cmd
npx cap open android
```

Открыть Xcode на macOS:

```cmd
npx cap open ios
```

## Где потом подключать платные функции

Проверка подписки должна жить не в компонентах, а в отдельном слое:

```text
src/features/featureAccess.ts
```

Сейчас там можно вручную включать и выключать доступ. В будущем этот файл должен получать статус подписки из native purchase SDK.

## Где потом подключать рекламу

Реклама должна включаться только в native mobile:

```text
src/platform/mobile.ts
src/features/consent.ts
src/components/AdSlot.tsx
```

В браузерной версии рекламный интерфейс скрыт, чтобы не перегружать UI во время разработки.

## Что важно для App Store / Google Play

Перед публикацией понадобятся:

- политика конфиденциальности;
- описание использования рекламы;
- описание покупок/подписки;
- корректная обработка согласия на рекламу;
- для iOS — App Tracking Transparency, если будет персонализированная реклама или трекинг;
- для Android — корректная настройка AdMob и Data Safety в Google Play Console.
