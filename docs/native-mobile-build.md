# Сборка Android/iOS через Capacitor

Проект использует Capacitor 8 и хранит нативные проекты в `android/` и `ios/`.
Папки являются исходным кодом приложения и должны попадать в Git. Скопированные
web-ресурсы, локальные SDK-пути, build-каталоги и signing secrets исключены.

## Единый цикл синхронизации

```bash
npm ci
npm run check
npm run mobile:sync
```

`mobile:sync` сначала выполняет строгую production-сборку, затем запускает
`cap sync`. Нельзя копировать старый `dist` в native-проекты вручную.

Дополнительная диагностика конфигурации:

```bash
npm run mobile:doctor
```

## Android

Сгенерированная конфигурация использует minSdk 24, compileSdk/targetSdk 36.
Для локальной сборки требуются Android Studio, Android SDK 36 и JDK 21.

```bash
npm run mobile:android
```

Команда синхронизирует проект и открывает каталог `android/` в Android Studio.
Release signing-файл и пароли нельзя хранить в репозитории.

## iOS

Deployment target — iOS 15. Сборка выполняется на macOS с Xcode:

```bash
npm run mobile:ios
```

Swift Package Manager подключает плагины из `ios/App/CapApp-SPM/Package.swift`.
Provisioning profile и signing team задаются локально в Xcode.

## Нативный runtime

- `src/platform/nativeRuntime.ts` — lifecycle, Back, Keyboard, Status Bar и Splash;
- `src/platform/nativeBridge.ts` — Haptics и определение платформы;
- `src/platform/share.ts` — системное меню отправки;
- `src/platform/purchases/purchaseProvider.ts` — граница будущего магазина.

При возврате из background приложение повторно проверяет entitlement. Android
Back сначала закрывает итог партии или активную рабочую вкладку, затем использует
историю WebView и только на корневом экране завершает приложение.

Service worker внутри native shell не регистрируется: офлайн-ресурсы уже входят
в приложение. Web/PWA продолжает использовать собственный service worker.

## Что ещё не реализовано

- StoreKit и Google Play Billing;
- серверная проверка чеков;
- рекламный SDK и consent platform;
- push notifications и deep links;
- release signing и публикация в магазинах;
- device E2E и low-memory/background стресс-тесты.

Наличие нативных проектов не означает готовность к публикации. Релизным
критерием остаётся проверка на реальных устройствах и sandbox-магазинах.
