# Android и iOS

## Текущее состояние

Мобильная оболочка подключена через Capacitor 8. В репозитории находятся
полноценные проекты `android/` и `ios/`, а `npm run mobile:sync` воспроизводимо
собирает web-клиент, копирует его в WebView и синхронизирует плагины.

Реализовано:

- официальный App lifecycle и обновление entitlement после возврата;
- системная кнопка Back: закрытие результата или рабочей вкладки до выхода;
- Haptics через официальный plugin с web-fallback;
- системное Share для PGN;
- Keyboard, Status Bar, Splash Screen и safe areas;
- отдельная проверка целостности нативных проектов в quality gate;
- одна кодовая база без импортов нативных SDK в шахматный домен.

## Следующий мобильный блок

1. Проверить debug-сборку и Stockfish Worker на реальном Android-устройстве.
2. Проверить foreground/background, клавиатуру и safe areas на iPhone.
3. Подключить StoreKit/Google Play Billing к готовому purchase adapter.
4. Добавить серверную проверку чеков до выдачи Premium.
5. Подключить crash reporting без PGN, FEN и персональных шахматных данных.
6. Подготовить signing, privacy manifests, Data Safety и TestFlight/Internal test.

Rewarded ads, push и deep links добавляются только после проверки основного
учебного цикла на устройствах. Они не должны проникать в game/analysis layers.
