# Архитектурные решения

ADR фиксируют решения, которые нельзя безопасно восстановить только по коду.

- `0001-module-boundaries.md` — направления зависимостей между слоями.
- `0002-engine-worker-isolation.md` — изоляция шахматного движка.
- `0003-verified-chess-facts.md` — единый проверяемый контракт объяснений.
- `0004-private-product-analytics.md` — минимизация данных аналитики.
- `0005-unified-release-quality-gate.md` — единый статус готовности релиза.
- `0006-webkit-keyboard-quality-barrier.md` — WebKit и клавиатурная доступность.
- `0007-performance-budgets-and-web-vitals.md` — бюджеты сборки и браузерные метрики.
- `0008-private-crash-reporting-and-storage-recovery.md` — приватная диагностика и восстановление локальных данных.
- `0009-versioned-indexeddb-storage-migrations.md` — версионированный переход на IndexedDB.
- `0010-verified-entitlements-and-purchase-adapter.md` — проверяемое право доступа без пользовательского переключателя тарифа.
- `0011-capacitor-native-shell.md` — единая Android/iOS-оболочка и граница нативного кода.

Статусы:

- `Принято` — решение обязательно для нового кода.
- `Заменено` — действует более новый ADR.
- `Отменено` — решение больше не применяется.

Архитектурные границы проверяются командой:

```bash
npm run check:architecture
```
