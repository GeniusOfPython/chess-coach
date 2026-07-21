import {
  assertSafeProductEventProperties,
  productEventSchemaVersion,
  type ProductEvent,
  type ProductEventFor,
  type ProductEventName,
  type ProductEventProperties,
} from "./productEvents";

export type ProductAnalyticsProvider = {
  capture: (event: ProductEvent) => void | Promise<void>;
};

let activeProvider: ProductAnalyticsProvider | null = null;

export function createProductEvent<Name extends ProductEventName>(
  name: Name,
  properties: ProductEventProperties[Name],
  occurredAt = new Date().toISOString(),
): ProductEventFor<Name> {
  assertSafeProductEventProperties(name, properties);

  return {
    schemaVersion: productEventSchemaVersion,
    name,
    occurredAt,
    properties,
  } as ProductEventFor<Name>;
}

export function setProductAnalyticsProvider(
  provider: ProductAnalyticsProvider | null,
) {
  activeProvider = provider;

  return () => {
    if (activeProvider === provider) {
      activeProvider = null;
    }
  };
}

export function trackProductEvent<Name extends ProductEventName>(
  name: Name,
  properties: ProductEventProperties[Name],
) {
  if (!activeProvider) {
    return;
  }

  try {
    const result = activeProvider.capture(createProductEvent(name, properties));

    if (result instanceof Promise) {
      void result.catch(() => undefined);
    }
  } catch {
    // Сбой аналитики не должен влиять на партию или обучение.
  }
}
