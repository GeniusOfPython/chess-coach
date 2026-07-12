# Подготовка к Android и iOS

Проект пока остается обычным Vite/React-приложением. Это правильно: сначала доводим логику тренера, затем упаковываем готовый web-клиент в мобильную оболочку.

## Уже подготовлено

- Добавлен `manifest.webmanifest` для режима standalone/PWA.
- Добавлены mobile meta-теги в `index.html`.
- Добавлены safe-area отступы для iPhone с вырезами.
- Увеличены touch-target зоны кнопок на сенсорных устройствах.
- Добавлен слой `featureAccess`, который позже можно связать с подпиской.

## Рекомендуемый путь для мобильной версии

1. Довести web-версию до стабильной 1.0.
2. Добавить Capacitor.
3. Подключить Android/iOS проекты.
4. Проверить работу Stockfish Worker внутри WebView.
5. Добавить покупку Premium через Google Play Billing / Apple In-App Purchase.
6. Подключить `featureAccess` к состоянию подписки.

## Будущие команды

Команды не добавлены в `package.json`, чтобы не ломать текущий проект зависимостями раньше времени.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Chess Coach" "com.artem409.chesscoach"
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

## Premium-функции-кандидаты

- Разбор последнего хода.
- Пояснения тренера.
- Журнал ошибок.
- Расширенная статистика.
- Нейросетевой разбор партии.
