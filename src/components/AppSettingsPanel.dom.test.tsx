// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppSettingsPanel from "./AppSettingsPanel";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof AppSettingsPanel>;

const freeEntitlement: Props["entitlement"] = {
  version: 2,
  kind: "free",
  source: "none",
  expiresAt: null,
  verifiedAt: null,
  verificationMode: null,
  autoRenews: false,
};

const mounted: Array<{ container: HTMLDivElement; root: Root }> = [];

function render(overrides: Partial<Props> = {}) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props: Props = {
    compactUi: false,
    showCompactUiSetting: false,
    showAnalysisArrows: true,
    boardTheme: "sunset",
    entitlement: freeEntitlement,
    subscriptionTier: "free",
    entitlementAccessStatus: "free",
    entitlementEffectiveUntil: null,
    entitlementVerificationStatus: "ready",
    canRestorePurchases: false,
    restoreStatus: "idle",
    canPurchase: true,
    offers: [],
    offersStatus: "idle",
    purchaseStatus: "idle",
    canManageSubscription: false,
    managementStatus: "idle",
    privacyConsent: { ads: "unknown", updatedAt: null },
    showMonetizationSettings: true,
    onCompactUiChange: vi.fn(),
    onShowAnalysisArrowsChange: vi.fn(),
    onBoardThemeChange: vi.fn(),
    onRestorePurchases: vi.fn(),
    onLoadOffers: vi.fn(),
    onPurchase: vi.fn(),
    onManageSubscription: vi.fn(),
    onPrivacyConsentChange: vi.fn(),
    onPrivacyConsentReset: vi.fn(),
    ...overrides,
  };

  act(() => root.render(<AppSettingsPanel {...props} />));
  mounted.push({ container, root });
  return { container, props };
}

afterEach(() => {
  for (const { container, root } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

describe("AppSettingsPanel DOM contract", () => {
  it("показывает вход в Premium при доступном платёжном адаптере", () => {
    const onLoadOffers = vi.fn();
    const { container } = render({ onLoadOffers });
    const button = Array.from(container.querySelectorAll("button"))
      .find((item) => item.textContent === "Посмотреть Premium");

    expect(button).toBeInstanceOf(HTMLButtonElement);

    act(() => button?.click());

    expect(onLoadOffers).toHaveBeenCalledOnce();
  });

  it("не показывает Premium, когда платёжный адаптер недоступен", () => {
    const { container } = render({ canPurchase: false });

    expect(container.textContent).not.toContain("Посмотреть Premium");
    expect(container.textContent).toContain(
      "Платёжный адаптер в этой сборке не подключён.",
    );
  });
});
